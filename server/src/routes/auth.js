const express = require('express');
const { register, login, getProfile, verifyToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.get('/verify', authenticate, verifyToken);

module.exports = router;