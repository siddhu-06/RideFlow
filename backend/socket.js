const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: [ 'GET', 'POST' ]
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('join', async (data) => {
            try {
                const { userId, userType } = data || {};

                if (!userId || ![ 'user', 'captain' ].includes(userType)) {
                    return socket.emit('socket-error', { message: 'Invalid join payload' });
                }

                if (userType === 'user') {
                    await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
                } else {
                    await captainModel.findByIdAndUpdate(userId, { socketId: socket.id, status: 'active' });
                }
            } catch (err) {
                socket.emit('socket-error', { message: err.message });
            }
        });


        socket.on('update-location-captain', async (data) => {
            try {
                const { userId, location } = data || {};
                const latitude = Number(location?.ltd);
                const longitude = Number(location?.lng);

                if (!userId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    return socket.emit('socket-error', { message: 'Invalid location data' });
                }

                await captainModel.findByIdAndUpdate(userId, {
                    status: 'active',
                    location: {
                        type: 'Point',
                        coordinates: [ longitude, latitude ],
                        ltd: latitude,
                        lng: longitude
                    }
                });
            } catch (err) {
                socket.emit('socket-error', { message: err.message });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

const sendMessageToSocketId = (socketId, messageObject) => {
    if (io && socketId && messageObject?.event) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

module.exports = { initializeSocket, sendMessageToSocketId };
