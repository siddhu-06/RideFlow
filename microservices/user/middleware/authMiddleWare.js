const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');

function getToken(req) {
    return req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
}

module.exports.userAuth = async (req, res, next) => {
    try {
        const token = getToken(req);

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const isBlacklisted = await blacklisttokenModel.findOne({ token });

        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'JWT_SECRET is not configured' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}
