const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, refreshToken } = require('../controllers/authController');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: "Too many login attempts from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh_token', refreshToken);

module.exports = router;
