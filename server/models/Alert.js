const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'temperature_high', 'temperature_low',
      'humidity_high', 'humidity_low',
      'motion_detected', 'no_motion',
      'device_offline', 'device_online',
      'battery_low', 'power_outage',
      'firmware_update', 'security_breach',
      'threshold_exceeded', 'sensor_failure'
    ]
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'emergency'],
    default: 'warning'
  },
  message: {
    type: String,
    required: true
  },
  value: {
    type: Number
  },
  threshold: {
    type: Number
  },
  unit: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'ignored'],
    default: 'active'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

alertSchema.index({ deviceId: 1, status: 1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
