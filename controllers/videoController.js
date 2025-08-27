const Video = require('../models/Video');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Get all videos
const getAllVideos = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = { isActive: true, isPublic: true };

    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const videos = await Video.find(query)
      .populate('uploadedBy', 'username')
      .select('-videoUrl') // Don't expose direct video URLs
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Video.countDocuments(query);

    logger.info(`Retrieved ${videos.length} videos for page ${page}`);

    res.json({
      success: true,
      data: videos,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Get all videos error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get video by ID
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid video ID format' 
      });
    }

    const video = await Video.findOne({ 
      _id: id, 
      isActive: true, 
      isPublic: true 
    }).populate('uploadedBy', 'username');

    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Increment view count
    await Video.findByIdAndUpdate(id, { $inc: { views: 1 } });
    video.views += 1;

    logger.info(`Video ${id} viewed by ${req.ip}`);

    res.json({ 
      success: true, 
      data: video 
    });
  } catch (error) {
    logger.error('Get video by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload new video
const uploadVideo = async (req, res) => {
  try {
    const { title, description, category, tags, isPublic = true } = req.body;
    
    if (!req.files || !req.files.video) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video file is required' 
      });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const videoData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      uploadedBy: req.user._id,
      videoUrl: videoFile.path,
      thumbnailUrl: thumbnailFile ? thumbnailFile.path : null,
      fileSize: videoFile.size,
      isPublic: isPublic === 'true' || isPublic === true,
      processingStatus: 'completed'
    };

    const video = new Video(videoData);
    await video.save();

    logger.info(`Video uploaded: ${video._id} by user: ${req.user._id}`);
    
    res.status(201).json({ 
      success: true, 
      data: {
        _id: video._id,
        title: video.title,
        description: video.description,
        category: video.category,
        tags: video.tags,
        thumbnailUrl: video.thumbnailUrl,
        createdAt: video.createdAt
      },
      message: 'Video uploaded successfully' 
    });
  } catch (error) {
    logger.error('Upload video error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.video) {
        req.files.video.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      if (req.files.thumbnail) {
        req.files.thumbnail.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update video
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, isPublic } = req.body;
    
    const video = await Video.findOne({ _id: id, isActive: true });
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Check if user owns the video or is admin
    if (video.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this video' 
      });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category) updateData.category = category;
    if (tags !== undefined) {
      updateData.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;
    updateData.updatedAt = new Date();

    const updatedVideo = await Video.findByIdAndUpdate(id, updateData, { 
      new: true,
      select: '-videoUrl'
    }).populate('uploadedBy', 'username');

    logger.info(`Video updated: ${id} by user: ${req.user._id}`);

    res.json({ 
      success: true, 
      data: updatedVideo,
      message: 'Video updated successfully' 
    });
  } catch (error) {
    logger.error('Update video error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const video = await Video.findOne({ _id: id, isActive: true });
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found' 
      });
    }

    // Check if user owns the video or is admin
    if (video.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this video' 
      });
    }

    // Soft delete - just mark as inactive
    await Video.findByIdAndUpdate(id, { 
      isActive: false,
      updatedAt: new Date()
    });

    logger.info(`Video deleted: ${id} by user: ${req.user._id}`);
    
    res.json({ 
      success: true, 
      message: 'Video deleted successfully' 
    });
  } catch (error) {
    logger.error('Delete video error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's videos
const getUserVideos = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const videos = await Video.find({ 
      uploadedBy: userId, 
      isActive: true 
    })
    .select('-videoUrl')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Video.countDocuments({ 
      uploadedBy: userId, 
      isActive: true 
    });

    res.json({
      success: true,
      data: videos,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Get user videos error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve user videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllVideos,
  getVideoById,
  uploadVideo,
  updateVideo,
  deleteVideo,
  getUserVideos
};
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
