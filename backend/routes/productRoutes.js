const express = require('express');
const router = express.Router();
const { getProducts, createProduct, deleteProduct, updateProduct } = require('../controllers/productController');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

const createProductRules = [
    body('name').notEmpty().withMessage('Product name is required').trim(),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('stockAmount').isNumeric().withMessage('Stock amount must be a number')
];

const updateProductRules = [
    body('name').optional().notEmpty().withMessage('Product name cannot be empty').trim(),
    body('price').optional().isNumeric().withMessage('Price must be a number'),
    body('stockAmount').optional().isNumeric().withMessage('Stock amount must be a number')
];

router.route('/')
    .get(getProducts)
    .post(createProductRules, validate, createProduct);

router.route('/:id')
    .delete(deleteProduct)
    .put(updateProductRules, validate, updateProduct);



module.exports = router;
