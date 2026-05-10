const captainModel = require('../models/captain.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { subscribeToQueue } = require('../service/rabbit');

const pendingRequests = new Map();

async function dispatchNewRide(rideData) {
    const availableCaptains = await captainModel.find({ isAvailable: true });
    const availableIds = new Set(availableCaptains.map(captain => String(captain._id)));

    for (const [ captainId, pending ] of pendingRequests.entries()) {
        if (!availableIds.has(captainId)) {
            continue;
        }

        clearTimeout(pending.timeout);
        pending.res.json(rideData);
        pendingRequests.delete(captainId);
    }
}

function sanitizeCaptain(captain) {
    const obj = captain?.toObject ? captain.toObject() : captain;
    if (obj?.password) {
        delete obj.password;
    }
    return obj;
}

function getToken(req) {
    return req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
}

function normalizeName(body) {
    if (body.fullname?.firstname) {
        return {
            fullname: {
                firstname: body.fullname.firstname,
                lastname: body.fullname.lastname || '',
            },
            name: `${body.fullname.firstname} ${body.fullname.lastname || ''}`.trim(),
        };
    }

    const [ firstname, ...rest ] = String(body.name || '').trim().split(/\s+/);
    return {
        fullname: {
            firstname,
            lastname: rest.join(' '),
        },
        name: body.name,
    };
}

module.exports.register = async (req, res) => {
    try {
        const { email, password, vehicle = {} } = req.body;
        const normalizedEmail = email.toLowerCase();
        const captain = await captainModel.findOne({ email: normalizedEmail });

        if (captain) {
            return res.status(400).json({ message: 'Captain already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const nameData = normalizeName(req.body);
        const newCaptain = new captainModel({
            ...nameData,
            email: normalizedEmail,
            password: hash,
            vehicle: {
                color: vehicle.color || 'white',
                plate: vehicle.plate || 'NA',
                capacity: vehicle.capacity || 1,
                vehicleType: vehicle.vehicleType || 'car',
            }
        });

        await newCaptain.save();

        const token = jwt.sign({ id: newCaptain._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
        });

        res.status(201).json({ token, captain: sanitizeCaptain(newCaptain) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const captain = await captainModel
            .findOne({ email: email.toLowerCase() })
            .select('+password');

        if (!captain) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, captain.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: captain._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
        });

        res.json({ token, captain: sanitizeCaptain(captain) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.logout = async (req, res) => {
    try {
        const token = getToken(req);
        if (token) {
            await blacklisttokenModel.updateOne({ token }, { token }, { upsert: true });
        }
        res.clearCookie('token');
        res.json({ message: 'Captain logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.profile = async (req, res) => {
    res.json(sanitizeCaptain(req.captain));
}

module.exports.toggleAvailability = async (req, res) => {
    try {
        const captain = await captainModel.findById(req.captain._id);
        captain.isAvailable = !captain.isAvailable;
        await captain.save();
        res.json(sanitizeCaptain(captain));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.waitForNewRide = async (req, res) => {
    const captain = await captainModel.findById(req.captain._id);

    if (!captain?.isAvailable) {
        return res.status(204).send();
    }

    const captainId = String(captain._id);
    const timeout = setTimeout(() => {
        pendingRequests.delete(captainId);
        res.status(204).send();
    }, 30000);

    pendingRequests.set(captainId, { res, timeout });

    req.on('close', () => {
        const pending = pendingRequests.get(captainId);
        if (pending?.res === res) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(captainId);
        }
    });
};

subscribeToQueue('new-ride', async (data) => {
    const rideData = JSON.parse(data);
    await dispatchNewRide(rideData);
});

module.exports.internalNewRide = async (req, res) => {
    await dispatchNewRide(req.body);
    res.status(202).json({ queued: true });
}
