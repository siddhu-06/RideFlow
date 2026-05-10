const mongoose = require('mongoose');

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: 3,
        },
        lastname: {
            type: String,
            default: '',
        }
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    vehicle: {
        color: {
            type: String,
            default: 'white',
        },
        plate: {
            type: String,
            default: 'NA',
        },
        capacity: {
            type: Number,
            default: 1,
        },
        vehicleType: {
            type: String,
            enum: [ 'car', 'moto', 'auto' ],
            default: 'car',
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('captain', captainSchema);
