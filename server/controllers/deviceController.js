const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');
const Command = require('../models/Command');
const Alert = require('../models/Alert');
const { publishCommand } = require('../config/mqtt');
const { broadcastToAll } = require('../config/websocket');

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
exports.getAllDevices = async (req, res) => {
  try {
    const { status, type, category, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { deviceId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const devices = await Device.find(query)
      .populate('owner', 'username email')
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Device.countDocuments(query);

    res.status(200).json({
      success: true,
      count: devices.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message
    });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id)
      .populate('owner', 'username email');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get latest telemetry
    const latestTelemetry = await Telemetry.findOne({ deviceId: device.deviceId })
      .sort({ timestamp: -1 });

    // Get recent alerts
    const recentAlerts = await Alert.find({ deviceId: device.deviceId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        device,
        latestTelemetry,
        recentAlerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching device',
      error: error.message
    });
  }
};

// @desc    Create new device
// @route   POST /api/devices
// @access  Private
exports.createDevice = async (req, res) => {
  try {
    const deviceData = {
      ...req.body,
      owner: req.user._id
    };

    const device = await Device.create(deviceData);

    // Add device to user's devices list
    await req.user.updateOne({
      $push: { devices: device._id }
    });

    broadcastToAll({
      type: 'device_created',
      data: device
    });

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating device',
      error: error.message
    });
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
exports.updateDevice = async (req, res) => {
  try {
    let device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check ownership
    if (device.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this device'
      });
    }

    device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    broadcastToAll({
      type: 'device_updated',
      data: device
    });

    res.status(200).json({
      success: true,
      message: 'Device updated successfully',
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating device',
      error: error.message
    });
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check ownership
    if (device.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this device'
      });
    }

    await device.deleteOne();

    // Remove from user's devices
    await req.user.updateOne({
      $pull: { devices: device._id }
    });

    // Clean up related data
    await Telemetry.deleteMany({ deviceId: device.deviceId });
    await Command.deleteMany({ deviceId: device.deviceId });
    await Alert.deleteMany({ deviceId: device.deviceId });

    broadcastToAll({
      type: 'device_deleted',
      data: { deviceId: device.deviceId }
    });

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting device',
      error: error.message
    });
  }
};

// @desc    Send command to device
// @route   POST /api/devices/:id/command
// @access  Private
exports.sendCommand = async (req, res) => {
  try {
    const { command, payload = {} } = req.body;
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Save command to database
    const commandDoc = await Command.create({
      deviceId: device.deviceId,
      command,
      payload,
      createdBy: req.user._id,
      status: 'pending'
    });

    // Publish via MQTT
    const published = publishCommand(device.deviceId, command, payload);

    if (published) {
      commandDoc.status = 'sent';
      commandDoc.sentAt = new Date();
      await commandDoc.save();
    }

    res.status(200).json({
      success: true,
      message: `Command '${command}' sent to device`,
      data: commandDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending command',
      error: error.message
    });
  }
};

// @desc    Get device telemetry
// @route   GET /api/devices/:id/telemetry
// @access  Private
exports.getDeviceTelemetry = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const { hours = 24, limit = 100 } = req.query;
    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const telemetry = await Telemetry.find({
      deviceId: device.deviceId,
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
      message: 'Error fetching telemetry',
      error: error.message
    });
  }
};

// @desc    Get device statistics
// @route   GET /api/devices/:id/stats
// @access  Private
exports.getDeviceStats = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const { hours = 24 } = req.query;
    const stats = await Telemetry.getAggregatedStats(device.deviceId, parseInt(hours));

    // Get command stats
    const commandStats = await Command.aggregate([
      { $match: { deviceId: device.deviceId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get alert stats
    const alertStats = await Alert.aggregate([
      { $match: { deviceId: device.deviceId } },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        telemetry: stats[0] || {},
        commands: commandStats,
        alerts: alertStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching device stats',
      error: error.message
    });
  }
};

// @desc    Bulk update devices
// @route   PUT /api/devices/bulk/update
// @access  Private/Admin
exports.bulkUpdate = async (req, res) => {
  try {
    const { deviceIds, updates } = req.body;

    const result = await Device.updateMany(
      { _id: { $in: deviceIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} devices updated`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk update',
      error: error.message
    });
  }
};

// @desc    Get device dashboard data
// @route   GET /api/devices/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const offlineDevices = await Device.countDocuments({ status: 'offline' });
    const errorDevices = await Device.countDocuments({ status: 'error' });

    const recentAlerts = await Alert.countDocuments({
      status: 'active',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const devicesByType = await Device.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const devicesByStatus = await Device.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
        error: errorDevices,
        recentAlerts,
        devicesByType,
        devicesByStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};
