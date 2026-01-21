const mongoose = require('mongoose');

const connectDB = async() => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not set');
        }

        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log("Mongoose connection error", error);
        throw error;
    }
}

module.exports = connectDB;
