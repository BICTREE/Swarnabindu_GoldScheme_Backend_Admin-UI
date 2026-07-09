const express = require('express');
const router = express.Router();
const adminComplianceController = require('../../controllers/adminComplianceController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

// Protect all admin routes
router.use(adminProtect);

// Grievances ticket administration
router.get('/grievance', adminComplianceController.getGrievances);
router.put('/grievance/:id/assign', adminComplianceController.assignGrievance);
router.put('/grievance/:id/resolve', adminComplianceController.resolveGrievance);

// Secure media delivery gateway
router.get('/media/:userId/:fileType', adminComplianceController.getSecureMedia);

// CERT-In Incident logging (Restricted to SUPER_ADMIN only)
router.post('/incidents/log', requireRole(['SUPER_ADMIN']), adminComplianceController.logIncident);
router.get('/incidents', requireRole(['SUPER_ADMIN']), adminComplianceController.getIncidents);

module.exports = router;
