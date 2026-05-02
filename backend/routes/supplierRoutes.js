const express = require('express');
const router = express.Router();
const { addSupplier, getSuppliers, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addSupplier);
router.get('/', protect, getSuppliers);
router.put('/:id', protect, updateSupplier);
router.delete('/:id', protect, deleteSupplier);

module.exports = router;
