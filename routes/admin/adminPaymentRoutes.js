const express = require('express');
const router = express.Router();
const adminPaymentController = require('../../controllers/admin/adminPaymentController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.use(adminProtect);

router.get('/', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminPaymentController.getPayments);
router.post('/:id/reconcile', requireRole(['SUPER_ADMIN']), adminPaymentController.reconcilePayment);

module.exports = router;
