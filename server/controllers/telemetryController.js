const Telemetry = require('../models/Telemetry');
const Device = require('../models/Device');

// @desc    Get all telemetry data
// @route   GET /api/telemetry
// @access  Private
exports.getAllTelemetry = async (req, res) => {
  try {
    const { deviceId, hours = 24, page = 1, limit = 100 } = req.query;

    const query = {};
    if (deviceId) query.deviceId = deviceId;

    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    query.timestamp = { $gte: startTime };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const telemetry = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Telemetry.countDocuments(query);

    res.status(200).json({
      success: true,
      count: telemetry.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: telemetry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching telemetry',
      error: error.message
    });
  }
};

// @desc    Get telemetry by device
// @route   GET /api/telemetry/device/:deviceId
// @access  Private
exports.getTelemetryByDevice = async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const telemetry = await Telemetry.find({
      deviceId: req.params.deviceId,
      timestamp: { $gte: startTime }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: telemetry.length,
      data: telemetry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching device telemetry',
      error: error.message
    });
  }
};

// @desc    Get latest telemetry
// @route   GET /api/telemetry/latest/:deviceId
// @access  Private
exports.getLatestTelemetry = async (req, res) => {
  try {
    const telemetry = await Telemetry.findOne({
      deviceId: req.params.deviceId
    }).sort({ timestamp: -1 });

    if (!telemetry) {
      return res.status(404).json({
        success: false,
        message: 'No telemetry data found for this device'
      });
    }

    res.status(200).json({
      success: true,
      data: telemetry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching latest telemetry',
      error: error.message
    });
  }
};

// @desc    Get telemetry statistics
// @route   GET /api/telemetry/stats/:deviceId
// @access  Private
exports.getTelemetryStats = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const stats = await Telemetry.getAggregatedStats(req.params.deviceId, parseInt(hours));

    res.status(200).json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching telemetry stats',
      error: error.message
    });
  }
};

// @desc    Create telemetry (for testing/simulation)
// @route   POST /api/telemetry
// @access  Private
exports.createTelemetry = async (req, res) => {
  try {
    const telemetry = await Telemetry.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Telemetry recorded',
      data: telemetry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating telemetry',
      error: error.message
    });
  }
};

// @desc    Delete old telemetry
// @route   DELETE /api/telemetry/cleanup
// @access  Private/Admin
exports.cleanupTelemetry = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const result = await Telemetry.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} old telemetry records deleted`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cleaning up telemetry',
      error: error.message
    });
  }
};
