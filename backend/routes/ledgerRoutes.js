const express = require('express');
const router = express.Router();
const { addEntry, getEntries } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addEntry);
router.get('/:partyId', getEntries);

module.exports = router;
