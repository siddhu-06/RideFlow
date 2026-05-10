const axios = require('axios');
const captainModel = require('../models/captain.model');

function requireApiKey() {
    const apiKey = process.env.GOOGLE_MAPS_API;
    if (!apiKey || apiKey === 'replace_me') {
        const err = new Error('Google Maps API key is not configured');
        err.statusCode = 503;
        throw err;
    }
    return apiKey;
}

function createGoogleError(message, statusCode = 502) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

module.exports.getAddressCoordinate = async (address) => {
    const apiKey = requireApiKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            const location = response.data.results[ 0 ].geometry.location;
            return {
                ltd: location.lat,
                lng: location.lng
            };
        } else {
            throw createGoogleError(`Unable to fetch coordinates: ${response.data.status}`);
        }
    } catch (error) {
        throw error;
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const apiKey = requireApiKey();

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    try {


        const response = await axios.get(url);
        if (response.data.status === 'OK') {

            if (response.data.rows[ 0 ].elements[ 0 ].status === 'ZERO_RESULTS') {
                throw createGoogleError('No routes found', 404);
            }

            return response.data.rows[ 0 ].elements[ 0 ];
        } else {
            throw createGoogleError(`Unable to fetch distance and time: ${response.data.status}`);
        }

    } catch (err) {
        throw err;
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const apiKey = requireApiKey();
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            return response.data.predictions.map(prediction => prediction.description).filter(value => value);
        } else if (response.data.status === 'ZERO_RESULTS') {
            return [];
        } else {
            throw createGoogleError(`Unable to fetch suggestions: ${response.data.status}`);
        }
    } catch (err) {
        throw err;
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    const captains = await captainModel.find({
        status: 'active',
        socketId: { $exists: true, $ne: null },
        location: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ Number(lng), Number(ltd) ]
                },
                $maxDistance: Number(radius) * 1000
            }
        }
    });

    return captains;
}
