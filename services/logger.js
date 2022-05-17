const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format:  winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.printf((info) => {
            return `${info.timestamp} - ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/tasks-logs.log' })
    ]
});
exports.logger = logger;