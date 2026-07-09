const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.post('/register-device', notificationController.registerDevice);

module.exports = router;
