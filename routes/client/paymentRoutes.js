const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/dues', paymentController.getDues);
router.post('/initialize', paymentController.initializePayment);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/receipt/:transactionId', paymentController.getReceipt);

module.exports = router;
