const userModel = require('../models/user.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { subscribeToQueue } = require('../service/rabbit');
const EventEmitter = require('events');

const rideEventEmitter = new EventEmitter();

function emitAcceptedRide(data) {
    const userId = String(data.user?._id || data.user || '');
    if (userId) {
        rideEventEmitter.emit(`ride-accepted:${userId}`, data);
    }
}

function sanitizeUser(user) {
    const obj = user?.toObject ? user.toObject() : user;
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
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();
        const user = await userModel.findOne({ email: normalizedEmail });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const nameData = normalizeName(req.body);
        const newUser = new userModel({
            ...nameData,
            email: normalizedEmail,
            password: hash,
        });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
        });

        res.status(201).json({ token, user: sanitizeUser(newUser) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel
            .findOne({ email: email.toLowerCase() })
            .select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
        });

        res.json({ token, user: sanitizeUser(user) });
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
        res.json({ message: 'User logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.profile = async (req, res) => {
    res.json(sanitizeUser(req.user));
}

module.exports.acceptedRide = async (req, res) => {
    const userId = String(req.user._id);
    const eventName = `ride-accepted:${userId}`;

    const timeout = setTimeout(() => {
        rideEventEmitter.removeListener(eventName, onAcceptedRide);
        res.status(204).send();
    }, 30000);

    function onAcceptedRide(data) {
        clearTimeout(timeout);
        res.json(data);
    }

    rideEventEmitter.once(eventName, onAcceptedRide);
}

subscribeToQueue('ride-accepted', async (msg) => {
    const data = JSON.parse(msg);
    emitAcceptedRide(data);
});

module.exports.internalRideAccepted = async (req, res) => {
    emitAcceptedRide(req.body);
    res.status(202).json({ queued: true });
}
