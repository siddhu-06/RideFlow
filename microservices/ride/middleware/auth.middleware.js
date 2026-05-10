const jwt = require('jsonwebtoken');
const axios = require('axios');

function getToken(req) {
    return req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
}

async function delegateProfile(token, path) {
    const response = await axios.get(`${process.env.BASE_URL || 'http://localhost:3000'}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
        timeout: 5000,
    });

    return response.data;
}

async function authorize(req, res, next, profilePath, assignKey) {
    try {
        const token = getToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (process.env.JWT_SECRET) {
            jwt.verify(token, process.env.JWT_SECRET);
        }

        const principal = await delegateProfile(token, profilePath);

        if (!principal) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req[ assignKey ] = principal;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.userAuth = async (req, res, next) => {
    authorize(req, res, next, '/user/profile', 'user');
}

module.exports.captainAuth = async (req, res, next) => {
    authorize(req, res, next, '/captain/profile', 'captain');
}
