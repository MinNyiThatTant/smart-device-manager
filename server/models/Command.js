const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  command: {
    type: String,
    required: true,
    enum: [
      'reboot', 'update', 'sleep', 'wake', 'reset',
      'led_on', 'led_off', 'led_blink',
      'relay_on', 'relay_off', 'relay_toggle',
      'set_interval', 'get_status', 'get_config',
      'update_config', 'factory_reset', 'calibrate',
      'start_stream', 'stop_stream', 'take_picture',
      'play_sound', 'set_volume', 'set_brightness'
    ]
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'executed', 'failed', 'timeout'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  response: {
    type: mongoose.Schema.Types.Mixed
  },
  errorMessage: {
    type: String
  },
  sentAt: {
    type: Date
  },
  executedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

commandSchema.index({ deviceId: 1, status: 1 });
commandSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Command', commandSchema);
