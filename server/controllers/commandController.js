const Command = require('../models/Command');
const Device = require('../models/Device');
const { publishCommand } = require('../config/mqtt');

// @desc    Get all commands
// @route   GET /api/commands
// @access  Private
exports.getAllCommands = async (req, res) => {
  try {
    const { deviceId, status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (deviceId) query.deviceId = deviceId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const commands = await Command.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Command.countDocuments(query);

    res.status(200).json({
      success: true,
      count: commands.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: commands
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching commands',
      error: error.message
    });
  }
};

// @desc    Get command by ID
// @route   GET /api/commands/:id
// @access  Private
exports.getCommand = async (req, res) => {
  try {
    const command = await Command.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!command) {
      return res.status(404).json({
        success: false,
        message: 'Command not found'
      });
    }

    res.status(200).json({
      success: true,
      data: command
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching command',
      error: error.message
    });
  }
};

// @desc    Create and send command
// @route   POST /api/commands
// @access  Private
exports.createCommand = async (req, res) => {
  try {
    const { deviceId, command, payload, priority = 'normal' } = req.body;

    // Verify device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Create command record
    const commandDoc = await Command.create({
      deviceId,
      command,
      payload,
      priority,
      createdBy: req.user._id,
      status: 'pending'
    });

    // Publish via MQTT
    const published = publishCommand(deviceId, command, payload);

    if (published) {
      commandDoc.status = 'sent';
      commandDoc.sentAt = new Date();
      await commandDoc.save();
    }

    res.status(201).json({
      success: true,
      message: `Command '${command}' queued for device ${deviceId}`,
      data: commandDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating command',
      error: error.message
    });
  }
};

// @desc    Update command status
// @route   PUT /api/commands/:id/status
// @access  Private
exports.updateCommandStatus = async (req, res) => {
  try {
    const { status, response, errorMessage } = req.body;

    const command = await Command.findById(req.params.id);
    if (!command) {
      return res.status(404).json({
        success: false,
        message: 'Command not found'
      });
    }

    command.status = status;
    if (response) command.response = response;
    if (errorMessage) command.errorMessage = errorMessage;

    if (status === 'executed') {
      command.executedAt = new Date();
      command.completedAt = new Date();
    } else if (status === 'failed') {
      command.completedAt = new Date();
    }

    await command.save();

    res.status(200).json({
      success: true,
      message: 'Command status updated',
      data: command
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating command status',
      error: error.message
    });
  }
};

// @desc    Retry failed command
// @route   POST /api/commands/:id/retry
// @access  Private
exports.retryCommand = async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    if (!command) {
      return res.status(404).json({
        success: false,
        message: 'Command not found'
      });
    }

    if (command.retryCount >= command.maxRetries) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry count reached'
      });
    }

    command.retryCount += 1;
    command.status = 'pending';
    await command.save();

    // Publish via MQTT again
    const published = publishCommand(command.deviceId, command.command, command.payload);

    if (published) {
      command.status = 'sent';
      command.sentAt = new Date();
      await command.save();
    }

    res.status(200).json({
      success: true,
      message: `Command retried (attempt ${command.retryCount})`,
      data: command
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrying command',
      error: error.message
    });
  }
};

// @desc    Delete command
// @route   DELETE /api/commands/:id
// @access  Private
exports.deleteCommand = async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    if (!command) {
      return res.status(404).json({
        success: false,
        message: 'Command not found'
      });
    }

    await command.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Command deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting command',
      error: error.message
    });
  }
};
