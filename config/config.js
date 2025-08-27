module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codedev',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // File upload configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || 104857600, // 100MB
    allowedVideoTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    videoPath: './uploads/videos/',
    thumbnailPath: './uploads/thumbnails/'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // CORS settings
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
};
