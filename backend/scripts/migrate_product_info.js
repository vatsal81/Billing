const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const PurchaseBill = require('../models/PurchaseBill');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find();
        console.log(`Processing ${products.length} products...`);

        // Fetch all bills to search locally (more efficient than many queries)
        const allBills = await PurchaseBill.find().sort({ billDate: -1 });
        console.log(`Searching through ${allBills.length} purchase bills...`);

        for (const product of products) {
            const pName = (product.name || "").trim().toLowerCase();
            const pNameEng = (product.nameEnglish || "").trim().toLowerCase();

            // Find latest bill where any item name matches (case-insensitive, trimmed)
            const latestBill = allBills.find(bill =>
                bill.items.some(item => {
                    const itemName = (item.name || "").trim().toLowerCase();
                    const itemNameEng = (item.nameEnglish || "").trim().toLowerCase();

                    return (pName && itemName === pName) ||
                        (pNameEng && itemNameEng === pNameEng) ||
                        (pNameEng && itemName === pNameEng) ||
                        (pName && itemNameEng === pName);
                })
            );

            if (latestBill) {
                product.lastSupplier = latestBill.supplierName;
                product.lastInvoice = latestBill.billNumber;
                await product.save();
                console.log(`[FOUND] Updated ${product.nameEnglish || product.name} -> ${latestBill.supplierName}`);
            } else {
                console.log(`[MISSING] No bill found for: ${product.nameEnglish || product.name}`);
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
