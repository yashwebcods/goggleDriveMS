require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000;
const connectDB = require('./config/mongoose');
const session = require('express-session');

// Connect to database
connectDB()
    .then(() => {
        // Middleware
        app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true
        }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));

        // session 
        app.use(session({
            secret: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            }
        }))

        // Routes
        app.use('/api/auth', require('./Routes/auth.routes'));
        app.use('/api/drive', require('./Routes/drive.routes'));

        // Health check
        app.get('/', (req, res) => {
            res.json({ message: 'GDMS Login System API is running...' });
        });

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