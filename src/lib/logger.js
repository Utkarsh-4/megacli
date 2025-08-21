const winston = require('winston');
const path = require('path');

// Define the path for the log files at the project root
// const logDir = path.resolve(process.cwd(), 'logs');
const logDir = path.join(__dirname, '..', '..', 'logs');

const logger = winston.createLogger({
  // The level of messages to log. 'info' means it will log info, warn, and error.
  level: 'info',
  
  // The format of the log messages
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),

  // Default metadata to include in every log
  defaultMeta: { service: 'megacli' },
  
  // Where to save the logs. We will save them to files.
  transports: [
    // - Write all logs with level 'error' and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // - Write all logs with level 'info' and below to `activity.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'activity.log') 
    }),
  ],
});

// If we're not in production, also log to the console with a simpler format.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}


module.exports = logger;