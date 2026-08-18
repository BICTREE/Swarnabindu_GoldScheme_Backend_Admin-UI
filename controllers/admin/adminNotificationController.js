const Notification = require('../../models/Notification');
const User = require('../../models/User');
const UserScheme = require('../../models/UserScheme');
const Joi = require('joi');
const helpers = require('../../utils/helpers');
const { sendPaymentReminderWhatsApp } = require('../../utils/whatsappService');

const alertSchema = Joi.object({
  title: Joi.string().min(3).required(),
  message: Joi.string().min(5).required()
});

/**
 * @desc    Broadcast message to all users
 * @route   POST /api/v1/admin/notifications/broadcast
 * @access  Private (Super Admin, Moderator)
 */
const broadcastNotification = async (req, res, next) => {
  try {
    const { error } = alertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { title, message } = req.body;

    // Find all verified users
    const users = await User.find({ isVerified: true });
    
    // Create notifications in database
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type: 'PAYMENT_REMINDER' // general announcement
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    console.log(`\n📢 [BROADCAST NOTIFICATION SENT] Title: "${title}" to ${users.length} users.\n`);

    return res.status(200).json({
      success: true,
      message: `Announcement broadcasted successfully to ${users.length} users`,
      errorCode: null,
      data: {
        sentCount: users.length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send targeted alert to a single user
 * @route   POST /api/v1/admin/notifications/user/:userId
 * @access  Private (Super Admin, Moderator)
 */
const sendTargetedNotification = async (req, res, next) => {
  try {
    const { error } = alertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { title, message } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    const notification = await helpers.sendMockNotification(
      user._id,
      title,
      message,
      'PAYMENT_REMINDER'
    );

    // Send WhatsApp Payment Reminder
    const activeSub = await UserScheme.findOne({ userId: user._id, status: 'ACTIVE' }).populate('schemeId');
    const schemeName = activeSub && activeSub.schemeId ? activeSub.schemeId.name : 'Swarna Bindu Gold Scheme';
    const dueAmount = activeSub ? activeSub.monthlyInvestment : 5000;
    const nextDueDate = new Date();
    nextDueDate.setDate(5);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    sendPaymentReminderWhatsApp({
      mobileNumber: user.mobileNumber,
      userName: user.kycDetails?.personalInfo?.fullName || 'Valued Customer',
      schemeName,
      dueAmount,
      dueDate: dueDateStr
    }).catch(err => console.error('WhatsApp Error:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Targeted notification sent successfully',
      errorCode: null,
      data: { notification }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  broadcastNotification,
  sendTargetedNotification
};
