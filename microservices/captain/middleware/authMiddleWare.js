const jwt = require('jsonwebtoken');
const captainModel = require('../models/captain.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');

function getToken(req) {
    return req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
}

module.exports.captainAuth = async (req, res, next) => {
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
        const captain = await captainModel.findById(decoded.id);

        if (!captain) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.captain = captain;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}
