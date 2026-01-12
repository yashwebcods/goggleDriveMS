require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 3000;
const connectDB = require('./config/mongoose');

connectDB();

app.listen(port , (err)=> {
    if(err){
        console.log(err);
        return false;
    }
    console.log(`Server is running on port ${port}`);
})

module.exports = app;