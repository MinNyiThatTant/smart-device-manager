const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateCommand } = require('../middleware/validate');
const {
  getAllCommands,
  getCommand,
  createCommand,
  updateCommandStatus,
  retryCommand,
  deleteCommand
} = require('../controllers/commandController');

router.route('/')
  .get(authenticate, getAllCommands)
  .post(authenticate, validateCommand, createCommand);

router.route('/:id')
  .get(authenticate, getCommand)
  .delete(authenticate, deleteCommand);

router.put('/:id/status', authenticate, updateCommandStatus);
router.post('/:id/retry', authenticate, retryCommand);

module.exports = router;
