const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken.model');

function sendAuthCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax'
    });
}

module.exports.registerUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fullname, email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        const isUserAlready = await userModel.findOne({ email: normalizedEmail });

        if (isUserAlready) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await userModel.hashPassword(password);

        const user = await userService.createUser({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email: normalizedEmail,
            password: hashedPassword
        });

        const token = user.generateAuthToken();
        user.password = undefined;
        sendAuthCookie(res, token);

        res.status(201).json({ token, user });
    } catch (err) {
        next(err);
    }
}

module.exports.loginUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = user.generateAuthToken();
        user.password = undefined;

        sendAuthCookie(res, token);

        res.status(200).json({ token, user });
    } catch (err) {
        next(err);
    }
}

module.exports.getUserProfile = async (req, res, next) => {
    res.status(200).json(req.user);
}

module.exports.logoutUser = async (req, res, next) => {
    try {
        res.clearCookie('token');
        const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

        if (token) {
            await blackListTokenModel.updateOne({ token }, { token }, { upsert: true });
        }

        res.status(200).json({ message: 'Logged out' });
    } catch (err) {
        next(err);
    }

}
