const mongoose = require('mongoose');

async function connect() {
    if (!process.env.MONGO_URL) {
        console.warn('MONGO_URL is not configured. User service MongoDB connection skipped.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('User service connected to MongoDB');
    } catch (err) {
        console.error('User service MongoDB connection failed:', err.message);
        if (process.env.MONGO_URL.startsWith('mongodb+srv://') && /ENOTFOUND|querySrv/i.test(err.message)) {
            console.error('Atlas SRV lookup failed. Check the Atlas hostname, allow network DNS access, or use MONGO_URL=mongodb://127.0.0.1/uber-users for local development.');
        }
    }
}

module.exports = connect;
