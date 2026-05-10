const rideModel = require('../models/ride.model');
const { publishToQueue } = require('../service/rabbit');
const axios = require('axios');

async function notifyServiceFallback(url, payload) {
    if (!url) {
        return false;
    }

    try {
        await axios.post(url, payload, { timeout: 5000 });
        return true;
    } catch (error) {
        console.error(`HTTP fallback failed for ${url}:`, error.message);
        return false;
    }
}

module.exports.createRide = async (req, res) => {
    try {
        const { pickup, destination, vehicleType = 'car', fare = 0 } = req.body;

        const newRide = new rideModel({
            user: req.user._id,
            pickup,
            destination,
            vehicleType,
            fare
        });

        await newRide.save();
        const published = await publishToQueue('new-ride', JSON.stringify(newRide));

        if (!published) {
            await notifyServiceFallback(`${process.env.CAPTAIN_SERVICE_URL || 'http://localhost:3002'}/internal/new-ride`, newRide);
        }

        res.status(201).json(newRide);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.acceptRide = async (req, res) => {
    try {
        const rideId = req.body.rideId || req.query.rideId;
        const ride = await rideModel.findOneAndUpdate({
            _id: rideId,
            status: 'requested'
        }, {
            status: 'accepted',
            captain: req.captain._id
        }, {
            new: true
        });

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found or already accepted' });
        }

        const published = await publishToQueue('ride-accepted', JSON.stringify(ride));

        if (!published) {
            await notifyServiceFallback(`${process.env.USER_SERVICE_URL || 'http://localhost:3001'}/internal/ride-accepted`, ride);
        }

        res.json(ride);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
