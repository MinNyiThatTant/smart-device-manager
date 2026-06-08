const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateDevice } = require('../middleware/validate');
const {
  getAllDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  sendCommand,
  getDeviceTelemetry,
  getDeviceStats,
  bulkUpdate,
  getDashboardSummary
} = require('../controllers/deviceController');

// Dashboard routes
router.get('/dashboard/summary', authenticate, getDashboardSummary);

// Main CRUD routes
router.route('/')
  .get(authenticate, getAllDevices)
  .post(authenticate, validateDevice, createDevice);

router.route('/bulk/update')
  .put(authenticate, authorize('admin'), bulkUpdate);

router.route('/:id')
  .get(authenticate, getDevice)
  .put(authenticate, updateDevice)
  .delete(authenticate, deleteDevice);

// Device-specific actions
router.post('/:id/command', authenticate, sendCommand);
router.get('/:id/telemetry', authenticate, getDeviceTelemetry);
router.get('/:id/stats', authenticate, getDeviceStats);

module.exports = router;
