const Video = require('../models/Video');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../utils/helpers');

// Get all videos
const getAllVideos = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query)
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: videos,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Get all videos error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get video by ID
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploadedBy', 'username email');

    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    res.json({ success: true, data: video });
  } catch (error) {
    logger.error('Get video by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Upload new video
const uploadVideo = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    
    if (!req.files || !req.files.video) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video file is required' 
      });
    }

    const videoData = {
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user.id,
      videoUrl: req.files.video[0].path,
      thumbnailUrl: req.files.thumbnail ? req.files.thumbnail[0].path : null,
      duration: req.body.duration || 0,
      fileSize: req.files.video[0].size
    };

    const video = new Video(videoData);
    await video.save();

    logger.info(`Video uploaded: ${video._id} by user: ${req.user.id}`);
    
    res.status(201).json({ 
      success: true, 
      data: video,
      message: 'Video uploaded successfully' 
    });
  } catch (error) {
    logger.error('Upload video error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update video
const updateVideo = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Check if user owns the video
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this video' 
      });
    }

    const updateData = {
      title: title || video.title,
      description: description || video.description,
      category: category || video.category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : video.tags,
      updatedAt: Date.now()
    };

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({ 
      success: true, 
      data: updatedVideo,
      message: 'Video updated successfully' 
    });
  } catch (error) {
    logger.error('Update video error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete video
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Check if user owns the video
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this video' 
      });
    }

    await Video.findByIdAndDelete(req.params.id);

    logger.info(`Video deleted: ${req.params.id} by user: ${req.user.id}`);
    
    res.json({ 
      success: true, 
      message: 'Video deleted successfully' 
    });
  } catch (error) {
    logger.error('Delete video error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllVideos,
  getVideoById,
  uploadVideo,
  updateVideo,
  deleteVideo
};
