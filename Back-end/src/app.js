const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use('/api/auth', require('./Routes/auth.routes'));
app.use('/api/drive', require('./Routes/drive.routes'));
app.use('/api/users', require('./Routes/user.routes'));

app.get('/', (req, res) => {
    res.json({ message: 'GDMS Login System API is running...' });
});

module.exports = app;
