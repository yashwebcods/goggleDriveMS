require('dotenv').config();

const app = require('../src/app');
const connectDB = require('../src/config/mongoose');

let isDbConnected = false;

module.exports = async (req, res) => {
    try {
        if (!isDbConnected) {
            await connectDB();
            isDbConnected = true;
        }

        return app(req, res);
    } catch (err) {
        const message = (err && err.message) ? String(err.message) : String(err);
        const includeDetails = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

        return res.status(500).json({
            success: false,
            message: message || 'Internal Server Error',
            error: includeDetails ? String(err && err.stack ? err.stack : err) : undefined,
        });
    }
};
