const http = require('http');
const app = require('./app');

const server = http.createServer(app);


const port = process.env.PORT || 3003;

server.listen(port, () => {
    console.log(`Ride service is running on port ${port}`);
})
