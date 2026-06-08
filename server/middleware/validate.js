const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const validateDevice = [
  body('deviceId')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Device ID must be between 3 and 50 characters'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be less than 100 characters'),
  body('type')
    .optional()
    .isIn(['esp32', 'esp8266', 'raspberry_pi', 'arduino', 'sensor', 'actuator', 'gateway', 'custom'])
    .withMessage('Invalid device type'),
  handleValidationErrors
];

const validateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateCommand = [
  body('command')
    .notEmpty()
    .withMessage('Command is required'),
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required'),
  handleValidationErrors
];

module.exports = {
  validateDevice,
  validateUser,
  validateLogin,
  validateCommand,
  handleValidationErrors
};
