const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const {
  getAllVideos,
  getVideoById,
  uploadVideo,
  updateVideo,
  deleteVideo
} = require('../controllers/videoController');

const { authenticate } = require('../middleware/auth');
const { validateVideo, validateVideoUpdate } = require('../middleware/validation');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Public routes
router.get('/', getAllVideos);
router.get('/:id', getVideoById);

// Protected routes
router.post('/', 
  authenticate, 
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), 
  validateVideo, 
  uploadVideo
);

router.put('/:id', authenticate, validateVideoUpdate, updateVideo);
router.delete('/:id', authenticate, deleteVideo);

module.exports = router;
