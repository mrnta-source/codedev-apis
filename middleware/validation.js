const Joi = require('joi');

// Video validation schema
const videoSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().valid('tutorial', 'entertainment', 'education', 'music', 'sports', 'news', 'gaming', 'other').required(),
  tags: Joi.string().optional(),
  duration: Joi.number().min(0).optional(),
  isPublic: Joi.boolean().optional()
});

// Video update validation schema
const videoUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().valid('tutorial', 'entertainment', 'education', 'music', 'sports', 'news', 'gaming', 'other').optional(),
  tags: Joi.string().optional(),
  isPublic: Joi.boolean().optional()
});

// User registration validation schema
const userRegistrationSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// User login validation schema
const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Validate video data
const validateVideo = (req, res, next) => {
  const { error } = videoSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  
  next();
};

// Validate video update data
const validateVideoUpdate = (req, res, next) => {
  const { error } = videoUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  
  next();
};

// Validate user registration
const validateUserRegistration = (req, res, next) => {
  const { error } = userRegistrationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  
  next();
};

// Validate user login
const validateUserLogin = (req, res, next) => {
  const { error } = userLoginSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  
  next();
};

module.exports = {
  validateVideo,
  validateVideoUpdate,
  validateUserRegistration,
  validateUserLogin
};
