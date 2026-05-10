const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBIT_URL || 'amqp://localhost';

let connection;
let channel;
let connecting;

async function connect() {
    if (channel) {
        return channel;
    }

    if (connecting) {
        return connecting;
    }

    connecting = amqp.connect(RABBITMQ_URL)
        .then(async (conn) => {
            connection = conn;
            channel = await conn.createChannel();

            connection.on('close', () => {
                console.warn('RabbitMQ connection closed. Reconnecting soon.');
                channel = null;
                connection = null;
                setTimeout(() => connect().catch(() => undefined), 5000);
            });

            connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err.message);
            });

            console.log('Ride service connected to RabbitMQ');
            return channel;
        })
        .catch((err) => {
            console.error('Ride service RabbitMQ unavailable:', err.message);
            channel = null;
            connection = null;
            setTimeout(() => connect().catch(() => undefined), 5000);
            return null;
        })
        .finally(() => {
            connecting = null;
        });

    return connecting;
}

async function subscribeToQueue(queueName, callback) {
    const ch = await connect();
    if (!ch) {
        return false;
    }

    await ch.assertQueue(queueName, { durable: true });
    await ch.consume(queueName, async (message) => {
        if (!message) {
            return;
        }

        try {
            await callback(message.content.toString());
            ch.ack(message);
        } catch (err) {
            console.error(`RabbitMQ consumer failed for ${queueName}:`, err.message);
            ch.nack(message, false, true);
        }
    });

    return true;
}

async function publishToQueue(queueName, data) {
    const ch = await connect();
    if (!ch) {
        return false;
    }

    await ch.assertQueue(queueName, { durable: true });
    return ch.sendToQueue(queueName, Buffer.from(data), { persistent: true });
}

module.exports = {
    subscribeToQueue,
    publishToQueue,
    connect,
};
