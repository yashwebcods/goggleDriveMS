const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('../Controllers/auth.controller');
const { protect } = require('./middleware/auth.middleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protect, getUserProfile);

module.exports = router;
