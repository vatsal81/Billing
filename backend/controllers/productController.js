const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Public
const createProduct = async (req, res) => {
    try {
        const { name, price, stockAmount, lowStockThreshold } = req.body;

        if (!name || !price) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        const product = await Product.create({
            name,
            price,
            stockAmount: stockAmount !== undefined ? stockAmount : 100,
            lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
        });

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Public
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        
        Object.assign(product, req.body);
        await product.save();
        res.status(200).json(product);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

module.exports = {
    getProducts,
    createProduct,
    deleteProduct,
    updateProduct
};
