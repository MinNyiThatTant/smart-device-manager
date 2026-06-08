const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Sensor Readings
  temperature: {
    value: { type: Number },
    unit: { type: String, default: 'celsius' }
  },
  humidity: {
    value: { type: Number },
    unit: { type: String, default: 'percent' }
  },
  pressure: {
    value: { type: Number },
    unit: { type: String, default: 'hPa' }
  },
  light: {
    value: { type: Number },
    unit: { type: String, default: 'lux' }
  },
  motion: {
    detected: { type: Boolean, default: false },
    count: { type: Number, default: 0 }
  },

  // Power Metrics
  voltage: { type: Number },
  current: { type: Number },
  power: { type: Number },
  energy: { type: Number },

  // Air Quality
  airQuality: {
    co2: { type: Number },
    pm25: { type: Number },
    pm10: { type: Number },
    voc: { type: Number }
  },

  // Soil/Environment
  soil: {
    moisture: { type: Number },
    ph: { type: Number }
  },
  water: {
    level: { type: Number },
    flow: { type: Number }
  },

  // GPS Location
  gps: {
    latitude: { type: Number },
    longitude: { type: Number },
    altitude: { type: Number },
    accuracy: { type: Number }
  },

  // Device Health
  deviceHealth: {
    uptime: { type: Number }, // seconds
    freeHeap: { type: Number },
    cpuUsage: { type: Number },
    wifiRssi: { type: Number },
    temperature: { type: Number } // device CPU temperature
  },

  // Raw data from device
  rawData: {
    type: mongoose.Schema.Types.Mixed
  },

  // Metadata
  metadata: {
    firmwareVersion: { type: String },
    samplingRate: { type: Number },
    sensorId: { type: String }
  }
});

// Compound indexes for efficient querying
telemetrySchema.index({ deviceId: 1, timestamp: -1 });
telemetrySchema.index({ timestamp: -1 });
telemetrySchema.index({ 'temperature.value': 1 });
telemetrySchema.index({ 'humidity.value': 1 });

// TTL index - auto delete data older than 90 days
telemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Static methods
telemetrySchema.statics.getLatestByDevice = function(deviceId, limit = 1) {
  return this.find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

telemetrySchema.statics.getTimeRange = function(deviceId, start, end) {
  return this.find({
    deviceId,
    timestamp: { $gte: start, $lte: end }
  }).sort({ timestamp: 1 });
};

telemetrySchema.statics.getAggregatedStats = async function(deviceId, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        deviceId,
        timestamp: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: null,
        avgTemp: { $avg: '$temperature.value' },
        minTemp: { $min: '$temperature.value' },
        maxTemp: { $max: '$temperature.value' },
        avgHumidity: { $avg: '$humidity.value' },
        minHumidity: { $min: '$humidity.value' },
        maxHumidity: { $max: '$humidity.value' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Telemetry', telemetrySchema);
