const mongoose = require('mongoose');
const Counter = require('./Counter');

const productSchema = mongoose.Schema(
    {
        productId: {
            type: String,
            unique: true,
        },
        name: {
            type: String,
            required: [true, 'Please add a product name'],
        },
        nameEnglish: {
            type: String,
            default: '',
        },
        hsnCode: {
            type: String,
            default: '',
        },
        price: {
            type: Number,
            required: [true, 'Please add a product price'],
        },
        purchaseRate: {
            type: Number,
            default: 0,
        },
        stockAmount: {
            type: Number,
            default: 100,
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
        },
        lastSupplier: {
            type: String,
            default: '',
        },
        lastInvoice: {
            type: String,
            default: '',
        }
    },
    {
        timestamps: true,
    }
);

productSchema.pre('save', async function () {
    if (!this.productId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { id: 'productId' },
                { $inc: { seq: 1 } },
                { returnDocument: 'after', upsert: true }
            );
            
            // If it was just created, ensure it starts at 1000
            if (counter.seq === 1) {
                counter.seq = 1001;
                await counter.save();
            }
            
            this.productId = `SH-${counter.seq}`;
        } catch (error) {
            throw error;
        }
    }
});

module.exports = mongoose.model('Product', productSchema);
