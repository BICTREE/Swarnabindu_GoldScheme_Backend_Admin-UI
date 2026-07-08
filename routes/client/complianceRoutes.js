const express = require('express');
const router = express.Router();
const complianceController = require('../../controllers/complianceController');
const { protect } = require('../../middleware/authMiddleware');

// Public Data Fiduciary contact info
router.get('/contact', complianceController.getFiduciaryContact);

// Protected compliance endpoints
router.use(protect);

// Consent log ledger
router.get('/consent', complianceController.getConsents);
router.post('/consent', complianceController.logConsent);
router.delete('/consent/:type', complianceController.withdrawConsent);

// Portability & Right to Erasure
router.get('/data-portability', complianceController.exportData);
router.post('/data-erasure', complianceController.requestErasure);

// Grievance ticketing
router.post('/grievance', complianceController.submitGrievance);
router.get('/grievance', complianceController.getMyGrievances);

module.exports = router;
