const mongoose = require('mongoose');

async function connectToDb() {
    if (!process.env.DB_CONNECT) {
        console.warn('DB_CONNECT is not configured. MongoDB connection skipped.');
        return;
    }

    try {
        await mongoose.connect(process.env.DB_CONNECT, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to DB');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        if (process.env.DB_CONNECT.startsWith('mongodb+srv://') && /ENOTFOUND|querySrv/i.test(err.message)) {
            console.error('Atlas SRV lookup failed. Check the Atlas hostname, allow network DNS access, or use DB_CONNECT=mongodb://127.0.0.1/uber-video for local development.');
        }
    }
}

module.exports = connectToDb;
