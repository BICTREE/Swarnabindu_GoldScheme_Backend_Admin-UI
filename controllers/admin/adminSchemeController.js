const Scheme = require('../../models/Scheme');
const UserScheme = require('../../models/UserScheme');
const Joi = require('joi');
const helpers = require('../../utils/helpers');

// Input Validation Schemas
const schemeSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  monthlyInvestment: Joi.number().positive().required(),
  durationMonths: Joi.number().integer().positive().required(),
  maturityBenefitPercent: Joi.number().min(0).max(100).required(),
  minGoldGram: Joi.number().positive().required(),
  termsAndConditions: Joi.string().required(),
  isActive: Joi.boolean().optional().default(true)
});

const updateSchemeSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  monthlyInvestment: Joi.number().positive().optional(),
  durationMonths: Joi.number().integer().positive().optional(),
  maturityBenefitPercent: Joi.number().min(0).max(100).optional(),
  minGoldGram: Joi.number().positive().optional(),
  termsAndConditions: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

/**
 * @desc    Get all schemes (paginated, includes active & inactive)
 * @route   GET /api/v1/admin/schemes
 * @access  Private (Super Admin, Moderator, Support)
 */
const getSchemes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const total = await Scheme.countDocuments(query);
    const schemes = await Scheme.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Schemes catalog retrieved successfully',
      errorCode: null,
      data: {
        schemes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new Gold Scheme in the catalog
 * @route   POST /api/v1/admin/schemes
 * @access  Private (Super Admin, Moderator)
 */
const createScheme = async (req, res, next) => {
  try {
    const { error } = schemeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const newScheme = await Scheme.create(req.body);

    // Audit Log
    await helpers.logAdminAction(
      req.admin._id,
      'CREATE_SCHEME',
      'Scheme',
      newScheme._id,
      { name: newScheme.name, monthlyInvestment: newScheme.monthlyInvestment },
      req
    );

    return res.status(201).json({
      success: true,
      message: 'New scheme added to catalog successfully',
      errorCode: null,
      data: { scheme: newScheme }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a scheme catalog template
 * @route   PUT /api/v1/admin/schemes/:id
 * @access  Private (Super Admin, Moderator)
 */
const updateScheme = async (req, res, next) => {
  try {
    const { error } = updateSchemeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    // Capture state before change for audit
    const beforeUpdate = {
      name: scheme.name,
      monthlyInvestment: scheme.monthlyInvestment,
      isActive: scheme.isActive
    };

    // Apply updates
    Object.keys(req.body).forEach(key => {
      scheme[key] = req.body[key];
    });

    await scheme.save();

    // Audit Log
    await helpers.logAdminAction(
      req.admin._id,
      'UPDATE_SCHEME',
      'Scheme',
      scheme._id,
      { before: beforeUpdate, after: req.body },
      req
    );

    return res.status(200).json({
      success: true,
      message: 'Scheme updated successfully',
      errorCode: null,
      data: { scheme }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle scheme active status (soft delete)
 * @route   DELETE /api/v1/admin/schemes/:id
 * @access  Private (Super Admin, Moderator)
 */
const toggleSchemeStatus = async (req, res, next) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    scheme.isActive = !scheme.isActive;
    await scheme.save();

    // Audit Log
    const action = scheme.isActive ? 'UPDATE_SCHEME' : 'DELETE_SCHEME';
    await helpers.logAdminAction(
      req.admin._id,
      action,
      'Scheme',
      scheme._id,
      { name: scheme.name, isActive: scheme.isActive },
      req
    );

    return res.status(200).json({
      success: true,
      message: `Scheme status toggled to ${scheme.isActive ? 'ACTIVE' : 'INACTIVE'}`,
      errorCode: null,
      data: {
        schemeId: scheme._id,
        isActive: scheme.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    List all user subscriptions (UserScheme records)
 * @route   GET /api/v1/admin/schemes/subscriptions
 * @access  Private (Super Admin, Moderator, Support)
 */
const getSubscriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const total = await UserScheme.countDocuments(query);
    const subscriptions = await UserScheme.find(query)
      .populate('userId', 'mobileNumber kycDetails.personalInfo.fullName')
      .populate('schemeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Subscribed schemes retrieved successfully',
      errorCode: null,
      data: {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSchemes,
  createScheme,
  updateScheme,
  toggleSchemeStatus,
  getSubscriptions
};
