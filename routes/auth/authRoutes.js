const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const { loginLimiter } = require('../../middleware/rateLimiter');

// Rota para registro
router.post('/register', authController.register);

// Rota para login com rate limiting
router.post('/login', loginLimiter, authController.login);





module.exports = router;
