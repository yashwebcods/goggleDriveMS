require('dotenv').config();
const app = require('./app');
const port = process.env.PORT || 3000;
const connectDB = require('./config/mongoose');

// Connect to database
connectDB()
    .then(() => {
        const server = app.listen(port, (err) => {
            if (err) {
                console.log(err);
                return false
            }
            console.log(`Server is running on port ${port}`);
        })

        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use. Close the process using that port or start the server on a different PORT.`);
                process.exit(1);
            }
            throw err;
        })
    })
    .catch((err) => {
        console.log('Failed to connect to database. Server not started.', err?.message || err);
        process.exit(1);
    });

module.exports = app;