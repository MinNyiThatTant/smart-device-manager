const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllTelemetry,
  getTelemetryByDevice,
  getLatestTelemetry,
  getTelemetryStats,
  createTelemetry,
  cleanupTelemetry
} = require('../controllers/telemetryController');

router.route('/')
  .get(authenticate, getAllTelemetry)
  .post(authenticate, createTelemetry);

router.get('/device/:deviceId', authenticate, getTelemetryByDevice);
router.get('/latest/:deviceId', authenticate, getLatestTelemetry);
router.get('/stats/:deviceId', authenticate, getTelemetryStats);
router.delete('/cleanup', authenticate, authorize('admin'), cleanupTelemetry);

module.exports = router;
