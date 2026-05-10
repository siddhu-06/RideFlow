const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBIT_URL || 'amqp://localhost';

let connection;
let channel;
let connecting;
const subscriptions = new Map();
const activeConsumers = new Set();

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
                activeConsumers.clear();
                setTimeout(() => connect().catch(() => undefined), 5000);
            });

            connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err.message);
            });

            console.log('Captain service connected to RabbitMQ');
            for (const [ queueName, callback ] of subscriptions.entries()) {
                await startConsumer(queueName, callback);
            }
            return channel;
        })
        .catch((err) => {
            console.error('Captain service RabbitMQ unavailable:', err.message);
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

async function startConsumer(queueName, callback) {
    if (!channel || activeConsumers.has(queueName)) {
        return Boolean(channel);
    }

    await channel.assertQueue(queueName, { durable: true });
    await channel.consume(queueName, async (message) => {
        if (!message) {
            return;
        }

        try {
            await callback(message.content.toString());
            channel.ack(message);
        } catch (err) {
            console.error(`RabbitMQ consumer failed for ${queueName}:`, err.message);
            channel.nack(message, false, true);
        }
    });

    activeConsumers.add(queueName);
    return true;
}

async function subscribeToQueue(queueName, callback) {
    subscriptions.set(queueName, callback);

    if (channel) {
        return startConsumer(queueName, callback);
    }

    if (!await connect()) {
        return false;
    }

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
