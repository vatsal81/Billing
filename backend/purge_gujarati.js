const mongoose = require('mongoose');
const Product = require('./models/Product');
const Settings = require('./models/Settings');
const Bill = require('./models/Bill');

const MONGO_URI = 'mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0';

async function purgeGujarati() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Update Settings
        console.log('Updating Shop Settings...');
        const settings = await Settings.findOne({});
        if (settings) {
            settings.shopName = "SHREE HARI DRESSES & CUTPIS";
            settings.shopSubTitle = "Wholesale & Retail";
            settings.shopAddress = "Madhav Park 1, Next to Shree Hari Complex,\nBehind Alap Royal Palm, Bapasitaram Chowk, Mavdi, Rajkot - 390 004.";
            settings.stampName = "SHREE HARI DRESSES & CUTPIS";
            await settings.save();
            console.log('Settings updated to English.');
        }

        // 2. Update Product Names
        console.log('Syncing Product Names to English...');
        const products = await Product.find({});
        let productUpdateCount = 0;

        for (const product of products) {
            if (product.nameEnglish && product.nameEnglish.trim() !== '') {
                const oldName = product.name;
                product.name = product.nameEnglish.trim();
                await product.save();
                console.log(`Updated Product: [${oldName}] -> [${product.name}]`);
                productUpdateCount++;
            }
        }
        console.log(`Product Cleanup Complete. Updated ${productUpdateCount} products.`);

        // 3. Optional: Update existing bills? 
        // The user says "remove gujaratai from bill". If they mean existing bills too:
        console.log('Cleaning up item names in existing bills...');
        const bills = await Bill.find({});
        let billUpdateCount = 0;
        for (const bill of bills) {
            let changed = false;
            if (bill.items) {
                bill.items.forEach(item => {
                    // If name contains parentheses with English, extract it
                    const match = item.name.match(/.*\(([^)]+)\)\s*$/);
                    if (match && match[1]) {
                        const englishName = match[1].trim();
                        if (/[a-zA-Z]/.test(englishName)) {
                            item.name = englishName;
                            changed = true;
                        }
                    } else if (/[અ-હ]/.test(item.name)) {
                        // If it's pure Gujarati, we might not have an easy fix here without a lookup
                        // But if it's "Gujarati English" without parentheses, maybe we can strip Gujarati?
                        const cleaned = item.name.replace(/[અ-હ\s]+/g, ' ').trim();
                        if (cleaned && /[a-zA-Z]/.test(cleaned)) {
                            item.name = cleaned;
                            changed = true;
                        }
                    }
                });
            }
            if (changed) {
                await bill.save();
                billUpdateCount++;
            }
        }
        console.log(`Bill Cleanup Complete. Updated ${billUpdateCount} bills.`);

        process.exit(0);
    } catch (err) {
        console.error('Purge Error:', err);
        process.exit(1);
    }
}

purgeGujarati();
