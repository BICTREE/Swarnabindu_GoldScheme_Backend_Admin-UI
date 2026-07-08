const Notification = require('../models/Notification');
const User = require('../models/User');
const Joi = require('joi');

const registerTokenSchema = Joi.object({
  deviceToken: Joi.string().required()
});

/**
 * @desc    Get user's notifications (paginated)
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments({ userId: req.user.id });
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      errorCode: null,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        errorCode: 'NOTIFICATION_NOT_FOUND',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      errorCode: null,
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register mobile device token for push notifications (FCM/APNs)
 * @route   POST /api/v1/notifications/register-device
 * @access  Private
 */
const registerDevice = async (req, res, next) => {
  try {
    const { error } = registerTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { deviceToken } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    user.deviceToken = deviceToken;
    user.lastSyncedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Device token registered successfully',
      errorCode: null,
      data: {
        deviceToken: user.deviceToken
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  registerDevice
};
