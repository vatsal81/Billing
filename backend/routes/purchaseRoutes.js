const express = require('express');
const router = express.Router();
const { addPurchaseBill, getPurchaseBills, getMonthlyReport, getSingleBillPdf, deletePurchaseBill, updatePurchaseBill } = require('../controllers/purchaseController');

const upload = require('../middleware/upload');

router.post('/', upload.fields([{ name: 'billImage', maxCount: 1 }, { name: 'ewayBillImage', maxCount: 1 }]), addPurchaseBill);
router.put('/:id', upload.fields([{ name: 'billImage', maxCount: 1 }, { name: 'ewayBillImage', maxCount: 1 }]), updatePurchaseBill);
router.get('/', getPurchaseBills);
router.get('/monthly-pdf', getMonthlyReport);
router.get('/:id/pdf', getSingleBillPdf);
router.delete('/:id', deletePurchaseBill);


module.exports = router;
