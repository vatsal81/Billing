const express = require('express');
const router = express.Router();
const { getCustomers } = require('../controllers/customerController');

router.get('/search', getCustomers);

module.exports = router;
