const express = require('express');
const router = express.Router();

const {
  streamVideo,
  getVideoMetadata,
  updateProgress
} = require('../controllers/playController');

const { authenticate, optionalAuth } = require('../middleware/auth');

// Stream video (public access)
router.get('/:id/stream', streamVideo);

// Get video metadata (public access)
router.get('/:id/metadata', getVideoMetadata);

// Update progress (requires authentication)
router.post('/:id/progress', authenticate, updateProgress);

module.exports = router;
