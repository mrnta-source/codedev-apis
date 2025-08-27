const logger = require('../utils/logger');

// Handle startup
logger.info('Starting CodeDev API...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Port: ${process.env.PORT || 5000}`);
logger.info(`MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);

// Start the server
require('../server');
