const express = require('express');
const router = express.Router();
const goldController = require('../../controllers/goldController');
const { protect } = require('../../middleware/authMiddleware');

// Get today's gold rate (Public)
router.get('/today', goldController.getTodayRate);

// Redeem gold (Private)
router.post('/redeem', protect, goldController.redeemGold);

module.exports = router;
