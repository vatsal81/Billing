const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateBill, generateManualBill, getBills, getBillById, voidBill, getBillPdf, getBookPdf } = require('../controllers/billController');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.route('/')
    .get(protect, getBills)
    .post(protect, [
        body('targetAmount').isNumeric().withMessage('Target amount must be a number'),
        validate
    ], generateBill);

router.route('/manual')
    .post(protect, [
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        validate
    ], generateManualBill);

router.route('/:id').get(getBillById).delete(protect, require('../controllers/billController').deleteBill);
router.route('/:id/pdf').get(getBillPdf);
router.route('/book/:bookNumber/pdf').get(getBookPdf);
router.route('/:id/void').put(protect, voidBill);



module.exports = router;
