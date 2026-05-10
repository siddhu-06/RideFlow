const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blacklistToken.model');
const { validationResult } = require('express-validator');

function sendAuthCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax'
    });
}

module.exports.registerCaptain = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fullname, email, password, vehicle } = req.body;
        const normalizedEmail = email.toLowerCase();

        const isCaptainAlreadyExist = await captainModel.findOne({ email: normalizedEmail });

        if (isCaptainAlreadyExist) {
            return res.status(400).json({ message: 'Captain already exists' });
        }

        const hashedPassword = await captainModel.hashPassword(password);

        const captain = await captainService.createCaptain({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email: normalizedEmail,
            password: hashedPassword,
            color: vehicle.color,
            plate: vehicle.plate,
            capacity: vehicle.capacity,
            vehicleType: vehicle.vehicleType
        });

        const token = captain.generateAuthToken();
        captain.password = undefined;
        sendAuthCookie(res, token);

        res.status(201).json({ token, captain });
    } catch (err) {
        next(err);
    }
}

module.exports.loginCaptain = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const captain = await captainModel.findOne({ email: email.toLowerCase() }).select('+password');

        if (!captain) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await captain.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = captain.generateAuthToken();
        captain.password = undefined;

        sendAuthCookie(res, token);

        res.status(200).json({ token, captain });
    } catch (err) {
        next(err);
    }
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

        if (token) {
            await blackListTokenModel.updateOne({ token }, { token }, { upsert: true });
        }

        res.clearCookie('token');

        res.status(200).json({ message: 'Logout successfully' });
    } catch (err) {
        next(err);
    }
}
