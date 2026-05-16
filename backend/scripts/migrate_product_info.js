const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const PurchaseBill = require('../models/PurchaseBill');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shreehari');
        console.log('Connected to MongoDB');

        const products = await Product.find();
        console.log(`Processing ${products.length} products...`);

        for (const product of products) {
            // Find the latest purchase bill containing this product
            const latestBill = await PurchaseBill.findOne({
                'items.name': product.name
            }).sort({ billDate: -1 });

            if (latestBill) {
                product.lastSupplier = latestBill.supplierName;
                product.lastInvoice = latestBill.billNumber;
                await product.save();
                console.log(`Updated ${product.name} with ${latestBill.supplierName} (${latestBill.billNumber})`);
            }
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
