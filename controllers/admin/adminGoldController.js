const GoldRate = require('../../models/GoldRate');
const Joi = require('joi');
const helpers = require('../../utils/helpers');

const updateRateSchema = Joi.object({
  rate22K_per_g: Joi.number().positive().required(),
  rate24K_per_8g: Joi.number().positive().required()
});

/**
 * @desc    Override live gold rate manually
 * @route   POST /api/v1/admin/gold-rate/update
 * @access  Private (Super Admin, Moderator)
 */
const updateGoldRate = async (req, res, next) => {
  try {
    const { error } = updateRateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { rate22K_per_g, rate24K_per_8g } = req.body;

    const newRate = await GoldRate.create({
      rate22K_per_g,
      rate24K_per_8g,
      lastUpdated: new Date()
    });

    // Log action to audit logs
    await helpers.logAdminAction(
      req.admin._id,
      'UPDATE_GOLD_RATE',
      'GoldRate',
      newRate._id,
      { rate22K_per_g, rate24K_per_8g },
      req
    );

    return res.status(200).json({
      success: true,
      message: 'Gold rate updated successfully',
      errorCode: null,
      data: {
        goldRate: newRate
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateGoldRate
};
