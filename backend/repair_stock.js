const mongoose = require('mongoose');
const Product = require('./models/Product');
const PurchaseBill = require('./models/PurchaseBill');

mongoose.connect('mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0')
.then(async () => {
    console.log('Connected to DB');
    const bill = await PurchaseBill.findOne({ billNumber: 'FS/2627/1536' });
    if (!bill) {
        console.log('Bill not found');
        process.exit();
    }

    console.log('Found bill with', bill.items.length, 'items');

    for (const item of bill.items) {
        let product = await Product.findOne({ name: item.name });
        if (!product) {
            product = await Product.findOne({ name: item.name.trim() });
        }
        
        if (product) {
            const billStock = (Number(item.meters) || Number(item.pcs) || 0);
            console.log(`Product: ${product.name}, Current Stock: ${product.stockAmount}, Bill Stock: ${billStock}`);
            
            // If stock is 0 or negative, it's highly likely it was reversed but not re-added
            if (product.stockAmount <= 0) {
                product.stockAmount += billStock;
                await product.save();
                console.log(`  -> Fixed! New Stock: ${product.stockAmount}`);
            }
        } else {
            console.log(`Product NOT found: ${item.name}`);
        }
    }
    console.log('Repair complete');
    process.exit();
})
.catch(err => {
    console.error('DB Error:', err);
    process.exit();
});
