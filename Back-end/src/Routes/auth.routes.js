const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin, getUserProfile, sendOtp, verifyOtp, forgetPassword, createMember, assignClientManager, getTeamOverview, getAdminSummary } = require('../Controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forget-password', forgetPassword)
// Protected routes
router.get('/profile', protect, getUserProfile);
router.post('/members', protect, createMember);
router.patch('/clients/:clientId/manager', protect, assignClientManager);
router.get('/team', protect, getTeamOverview);
router.get('/admin/summary', protect, getAdminSummary);

module.exports = router;
