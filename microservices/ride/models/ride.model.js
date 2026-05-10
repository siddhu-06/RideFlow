const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    captain: {
        type: mongoose.Schema.Types.ObjectId,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    pickup: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    vehicleType: {
        type: String,
        enum: [ 'auto', 'car', 'moto' ],
        default: 'car',
    },
    fare: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: [ 'requested', 'accepted', 'started', 'completed' ],
        default: 'requested'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('ride', rideSchema);
