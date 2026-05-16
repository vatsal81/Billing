const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const PurchaseBill = require('../models/PurchaseBill');

dotenv.config();

const linkBillsToProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find();
        const bills = await PurchaseBill.find();
        
        console.log(`Processing ${bills.length} bills and ${products.length} products...`);

        let updatedCount = 0;
        for (const bill of bills) {
            let billModified = false;
            for (const item of bill.items) {
                if (!item.productId) {
                    const pName = (item.name || "").trim().toLowerCase();
                    const pNameEng = (item.nameEnglish || "").trim().toLowerCase();

                    const match = products.find(p => {
                        const targetName = (p.name || "").trim().toLowerCase();
                        const targetNameEng = (p.nameEnglish || "").trim().toLowerCase();
                        return (pName && targetName === pName) || 
                               (pNameEng && targetNameEng === pNameEng) ||
                               (pName && targetNameEng === pName) ||
                               (pNameEng && targetName === pNameEng);
                    });

                    if (match) {
                        item.productId = match.productId;
                        billModified = true;
                    }
                }
            }
            if (billModified) {
                await bill.save();
                updatedCount++;
            }
        }

        console.log(`Updated ${updatedCount} bills with Product IDs`);
        
        // Now sync product info using these IDs
        console.log('Syncing product last supplier/invoice info...');
        for (const product of products) {
            const latestBill = bills
                .filter(b => b.items.some(i => i.productId === product.productId))
                .sort((a, b) => new Date(b.billDate) - new Date(a.billDate))[0];

            if (latestBill) {
                product.lastSupplier = latestBill.supplierName;
                product.lastInvoice = latestBill.billNumber;
                await product.save();
                console.log(`[SYNCED] ${product.productId} -> ${latestBill.supplierName}`);
            }
        }

        console.log('Final migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

linkBillsToProducts();
