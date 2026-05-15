const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Product = require('./models/Product');
const Bill = require('./models/Bill');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/test?retryWrites=true&w=majority';

async function deepPurge() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Final Product Sync
        console.log('--- Phase 1: Standardizing Product Names ---');
        const products = await Product.find({});
        let productMap = {}; // To use for bill cleanup
        let productUpdated = 0;

        for (const p of products) {
            let changed = false;
            if (p.nameEnglish && p.nameEnglish.trim() !== '') {
                const newName = p.nameEnglish.trim();
                if (p.name !== newName) {
                    p.name = newName;
                    changed = true;
                }
            }
            
            // Ensure name doesn't have Gujarati even if nameEnglish was empty
            if (/[^\x00-\x7F]/.test(p.name)) {
                p.name = p.name.replace(/[^\x00-\x7F]+/g, ' ').trim();
                changed = true;
            }

            if (changed) {
                await p.save();
                productUpdated++;
            }
            productMap[p._id.toString()] = p.name;
        }
        console.log(`Updated ${productUpdated} products.`);

        // 2. Bill Sanitization
        console.log('--- Phase 2: Sanitizing Existing Bills ---');
        const bills = await Bill.find({});
        let billUpdated = 0;

        for (const bill of bills) {
            let billChanged = false;
            if (bill.items && Array.isArray(bill.items)) {
                for (let item of bill.items) {
                    const productId = item.product ? item.product.toString() : null;
                    const oldItemName = item.name;
                    
                    if (productId && productMap[productId]) {
                        // Priority: Match with current product name
                        if (item.name !== productMap[productId]) {
                            item.name = productMap[productId];
                            billChanged = true;
                        }
                    } else if (/[^\x00-\x7F]/.test(item.name)) {
                        // Fallback: Strip non-ASCII (Gujarati) characters
                        // Specifically look for English in parentheses first
                        const match = item.name.match(/\(([^)]*[a-zA-Z][^)]*)\)\s*$/);
                        if (match && match[1]) {
                            item.name = match[1].trim();
                        } else {
                            item.name = item.name.replace(/[^\x00-\x7F]+/g, ' ').trim();
                        }
                        billChanged = true;
                    }
                    
                    if (billChanged && oldItemName !== item.name) {
                        console.log(`Bill ${bill.serialNumber || bill._id}: [${oldItemName}] -> [${item.name}]`);
                    }
                }
            }
            
            if (billChanged) {
                // We need to use markModified because items is an array of objects
                bill.markModified('items');
                await bill.save();
                billUpdated++;
            }
        }
        console.log(`Sanitized ${billUpdated} bills.`);

        console.log('Deep Purge Complete.');
        process.exit(0);
    } catch (err) {
        console.error('Deep Purge Failed:', err);
        process.exit(1);
    }
}

deepPurge();
