const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateBill, generateManualBill, getBills, voidBill, getBillPdf, getBookPdf } = require('../controllers/billController');

router.route('/').get(protect, getBills).post(protect, generateBill);
router.route('/manual').post(protect, generateManualBill);
router.route('/:id/pdf').get(getBillPdf);
router.route('/book/:bookNumber/pdf').get(getBookPdf);
router.route('/:id/void').put(protect, voidBill);
router.route('/:id').delete(protect, require('../controllers/billController').deleteBill);


module.exports = router;
