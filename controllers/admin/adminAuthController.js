const jwt = require('jsonwebtoken');
const Joi = require('joi');
const AdminUser = require('../../models/AdminUser');
const helpers = require('../../utils/helpers');

// Input Validation Schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  role: Joi.string().valid('SUPER_ADMIN', 'MODERATOR', 'SUPPORT').required()
});

/**
 * @desc    Admin login
 * @route   POST /api/v1/admin/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { email, password } = req.body;

    // Find admin user
    const admin = await AdminUser.findOne({ email });
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive admin account',
        errorCode: 'INVALID_CREDENTIALS',
        data: null
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
        data: null
      });
    }

    // Generate JWT access token containing ID and Role claims
    const accessToken = jwt.sign(
      { id: admin._id, role: admin.role, isAdmin: true },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' } // Admin token valid for 2 hours
    );

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      errorCode: null,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        accessToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new admin account (restricted to SUPER_ADMIN)
 * @route   POST /api/v1/admin/auth/create-admin
 * @access  Private (Super Admin only)
 */
const createAdmin = async (req, res, next) => {
  try {
    const { error } = createAdminSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { email, password, name, role } = req.body;

    // Check if email already exists
    const existing = await AdminUser.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Admin account with this email already exists',
        errorCode: 'EMAIL_ALREADY_EXISTS',
        data: null
      });
    }

    const newAdmin = await AdminUser.create({
      email,
      password,
      name,
      role
    });

    // Log action to audit logs
    await helpers.logAdminAction(
      req.admin._id,
      'CREATE_ADMIN',
      'AdminUser',
      newAdmin._id,
      { email: newAdmin.email, role: newAdmin.role },
      req
    );

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      errorCode: null,
      data: {
        admin: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  createAdmin
};
