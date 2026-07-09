const express = require('express');
const router = express.Router();
const schemeController = require('../../controllers/schemeController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/', schemeController.getSchemes);
router.get('/my-schemes', schemeController.getMySchemes);
router.get('/:id', schemeController.getSchemeById);
router.post('/:id/join', schemeController.joinScheme);

module.exports = router;
