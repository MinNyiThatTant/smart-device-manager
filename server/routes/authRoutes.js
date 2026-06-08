const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateUser, validateLogin } = require('../middleware/validate');
const {
  register,
  login,
  getMe,
  updatePassword,
  logout
} = require('../controllers/authController');

router.post('/register', validateUser, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, updatePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
