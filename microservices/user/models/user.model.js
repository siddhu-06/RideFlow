const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('user', userSchema);
