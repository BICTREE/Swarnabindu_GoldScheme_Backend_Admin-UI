const express = require('express');
const router = express.Router();
const adminSchemeController = require('../../controllers/admin/adminSchemeController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.use(adminProtect);

router.get('/', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminSchemeController.getSchemes);
router.get('/subscriptions', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminSchemeController.getSubscriptions);

router.post('/', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminSchemeController.createScheme);
router.put('/:id', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminSchemeController.updateScheme);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminSchemeController.toggleSchemeStatus);

module.exports = router;
