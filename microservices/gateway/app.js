const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const expressProxy = require('express-http-proxy');

const app = express();
const port = process.env.PORT || 3000;

const services = {
    user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    captain: process.env.CAPTAIN_SERVICE_URL || 'http://localhost:3002',
    ride: process.env.RIDE_SERVICE_URL || 'http://localhost:3003',
};

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : true,
    credentials: true,
}));

app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'rideflow-gateway',
        status: 'ok',
        routes: services,
    });
});

app.use('/user', expressProxy(services.user));
app.use('/captain', expressProxy(services.captain));
app.use('/ride', expressProxy(services.ride));

app.use((req, res) => {
    res.status(404).json({ message: 'Gateway route not found' });
});

app.listen(port, () => {
    console.log(`Gateway server listening on port ${port}`);
});
