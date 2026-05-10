const http = require('http');
const app = require('./app');


const server = http.createServer(app);




const port = process.env.PORT || 3002;

server.listen(port, () => {
    console.log(`Captain service is running on port ${port}`);
});
