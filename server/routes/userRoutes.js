const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile
} = require('../controllers/userController');

// Admin routes
router.route('/')
  .get(authenticate, authorize('admin'), getAllUsers);

router.route('/:id')
  .get(authenticate, authorize('admin'), getUser)
  .put(authenticate, authorize('admin'), updateUser)
  .delete(authenticate, authorize('admin'), deleteUser);

// User profile routes
router.get('/profile/me', authenticate, getProfile);
router.put('/profile/me', authenticate, updateProfile);

module.exports = router;
