const morgan = require('morgan');

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) return '';
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
             (res._startAt[1] - req._startAt[1]) / 1000000;
  return ms.toFixed(2);
});

// Custom format
const customFormat = ':method :url :status :response-time-ms ms - :res[content-length] bytes';

const logger = morgan(customFormat, {
  skip: (req, res) => process.env.NODE_ENV === 'test'
});

module.exports = logger;
