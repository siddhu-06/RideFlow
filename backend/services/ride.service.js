const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const crypto = require('crypto');

const RATES = {
    auto: { baseFare: 30, perKmRate: 10, perMinuteRate: 2 },
    car: { baseFare: 50, perKmRate: 15, perMinuteRate: 3 },
    moto: { baseFare: 20, perKmRate: 8, perMinuteRate: 1.5 }
};

function createError(message, statusCode = 400) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

function sanitizeRide(ride) {
    const obj = ride?.toObject ? ride.toObject() : ride;
    if (obj?.otp) {
        delete obj.otp;
    }
    return obj;
}

function calculateFares(distanceTime) {
    const distanceKm = distanceTime.distance.value / 1000;
    const durationMin = distanceTime.duration.value / 60;
    return Object.fromEntries(Object.entries(RATES).map(([ vehicleType, rate ]) => [
        vehicleType,
        Math.round(rate.baseFare + (distanceKm * rate.perKmRate) + (durationMin * rate.perMinuteRate))
    ]));
}

async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw createError('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);
    return calculateFares(distanceTime);
}

module.exports.getFare = getFare;


function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw createError('All fields are required');
    }

    if (!RATES[ vehicleType ]) {
        throw createError('Invalid vehicle type');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);
    const fare = calculateFares(distanceTime);

    const ride = await rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[ vehicleType ],
        vehicleType,
        distance: distanceTime.distance.value,
        duration: distanceTime.duration.value
    })

    return ride;
}

module.exports.confirmRide = async ({
    rideId, captain
}) => {
    if (!rideId) {
        throw createError('Ride id is required');
    }

    const ride = await rideModel.findOneAndUpdate({
        _id: rideId,
        status: 'pending'
    }, {
        status: 'accepted',
        captain: captain._id
    }, {
        new: true
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw createError('Ride not found or already accepted', 404);
    }

    return ride;
}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw createError('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw createError('Ride not found', 404);
    }

    if (ride.status !== 'accepted') {
        throw createError('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw createError('Invalid OTP', 401);
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    }, {
        new: true
    })
        .populate('user')
        .populate('captain')
        .select('+otp');

    return updatedRide;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw createError('Ride id is required');
    }

    const ride = await rideModel.findOneAndUpdate({
        _id: rideId,
        captain: captain._id,
        status: 'ongoing'
    }, {
        status: 'completed'
    }, {
        new: true
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw createError('Ride not found or not ongoing', 404);
    }

    return ride;
}

module.exports.sanitizeRide = sanitizeRide;
