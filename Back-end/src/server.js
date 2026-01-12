require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000;
const connectDB = require('./config/mongoose');

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./Routes/auth.routes'));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'GDMS Login System API is running...' });
});

app.listen(port , (err)=> {
    if(err){
        console.log(err);
        return false;
    }
    console.log(`Server is running on port ${port}`);
})

module.exports = app;