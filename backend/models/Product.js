const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a product name'],
        },
        price: {
            type: Number,
            required: [true, 'Please add a product price'],
        },
        stockAmount: {
            type: Number,
            default: 100,
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Product', productSchema);
