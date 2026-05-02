const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');

const upload = require('../middleware/upload');

router.route('/')
    .get(getSettings)
    .put(upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), updateSettings);


module.exports = router;
