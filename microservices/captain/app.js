const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const connect = require('./db/db');
const captainRoutes = require('./routes/captain.routes');
const rabbitMq = require('./service/rabbit');

connect();
rabbitMq.connect().catch(() => undefined);

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : true,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'rideflow-captain-service',
        status: 'ok',
        database: mongoose.connection.readyState,
    });
});

app.use('/', captainRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Captain route not found' });
});

module.exports = app;
