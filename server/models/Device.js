const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  // Device Identification
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Device Type & Classification
  type: {
    type: String,
    required: true,
    enum: ['esp32', 'esp8266', 'raspberry_pi', 'arduino', 'sensor', 'actuator', 'gateway', 'custom'],
    default: 'esp32'
  },
  category: {
    type: String,
    enum: ['temperature', 'humidity', 'motion', 'light', 'security', 'energy', 'environment', 'industrial', 'home_automation', 'other'],
    default: 'other'
  },

  // Hardware Info
  model: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  firmware: {
    version: { type: String, trim: true },
    lastUpdated: { type: Date }
  },
  hardware: {
    chipId: { type: String },
    macAddress: { type: String },
    ipAddress: { type: String },
    wifiSsid: { type: String },
    wifiRssi: { type: Number } // WiFi signal strength
  },

  // Device Status
  status: {
    type: String,
    enum: ['online', 'offline', 'sleeping', 'error', 'maintenance', 'updating'],
    default: 'offline',
    index: true
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Capabilities & Sensors
  capabilities: [{
    type: String,
    enum: ['sensor', 'actuator', 'camera', 'display', 'speaker', 'microphone', 'gps', 'bluetooth', 'wifi', 'ethernet', 'battery', 'solar']
  }],
  sensors: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    unit: { type: String },
    minValue: { type: Number },
    maxValue: { type: Number },
    threshold: {
      min: { type: Number },
      max: { type: Number },
      alertEnabled: { type: Boolean, default: false }
    },
    calibration: {
      offset: { type: Number, default: 0 },
      factor: { type: Number, default: 1 }
    },
    active: { type: Boolean, default: true }
  }],

  // Location
  location: {
    name: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    altitude: { type: Number },
    room: { type: String },
    building: { type: String }
  },

  // Power Management
  power: {
    source: { type: String, enum: ['ac', 'battery', 'solar', 'usb', 'other'], default: 'ac' },
    batteryLevel: { type: Number, min: 0, max: 100 },
    batteryVoltage: { type: Number },
    isCharging: { type: Boolean, default: false },
    powerConsumption: { type: Number } // Watts
  },

  // Configuration
  config: {
    updateInterval: { type: Number, default: 60 }, // seconds
    sleepMode: { type: Boolean, default: false },
    sleepDuration: { type: Number, default: 300 }, // seconds
    deepSleep: { type: Boolean, default: false },
    ledEnabled: { type: Boolean, default: true },
    debugMode: { type: Boolean, default: false }
  },

  // MQTT Topics
  mqttTopics: {
    status: { type: String },
    telemetry: { type: String },
    commands: { type: String },
    config: { type: String }
  },

  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
deviceSchema.index({ status: 1, lastSeen: -1 });
deviceSchema.index({ owner: 1, status: 1 });
deviceSchema.index({ type: 1, category: 1 });
deviceSchema.index({ 'location.name': 1 });

// Update timestamp on save
deviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for online status
deviceSchema.virtual('isOnline').get(function() {
  if (!this.lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo && this.status === 'online';
});

// Method to check if device is responsive
deviceSchema.methods.isResponsive = function() {
  if (!this.lastSeen) return false;
  const threshold = this.config.updateInterval * 3 * 1000; // 3x update interval
  return (Date.now() - this.lastSeen.getTime()) < threshold;
};

// Static method to find offline devices
deviceSchema.statics.findOfflineDevices = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({
    lastSeen: { $lt: fiveMinutesAgo },
    status: { $ne: 'offline' }
  });
};

module.exports = mongoose.model('Device', deviceSchema);
