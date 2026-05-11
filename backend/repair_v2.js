const mongoose = require('mongoose');
const Product = require('./models/Product');
const PurchaseBill = require('./models/PurchaseBill');
const Supplier = require('./models/Supplier');
const LedgerEntry = require('./models/LedgerEntry');

mongoose.connect('mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0')
.then(async () => {
    console.log('Cleaning up (Version 2 - Space Resistant)...');
    
    // 1. Repair Suppliers
    const suppliers = await Supplier.find({});
    for (const s of suppliers) {
        const trimmedName = s.name.trim();
        // Search for bills with name, trimmed name, or name with space
        const bills = await PurchaseBill.find({ 
            $or: [
                { supplierName: s.name },
                { supplierName: trimmedName },
                { supplierName: trimmedName + ' ' }
            ]
        });
        
        const total = bills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
        s.balance = total;
        await s.save();
        console.log(`Supplier [${s.name}] - Found ${bills.length} bills. Balance restored to ${total}`);
    }
    
    // 2. Repair Ledger
    await LedgerEntry.deleteMany({ partyType: 'supplier' });
    const allBills = await PurchaseBill.find({});
    for (const b of allBills) {
        const trimmedName = b.supplierName.trim();
        let s = await Supplier.findOne({ 
            $or: [
                { name: b.supplierName },
                { name: trimmedName },
                { name: trimmedName + ' ' }
            ]
        });
        
        if (s) {
            await LedgerEntry.create({
                partyType: 'supplier',
                partyId: s._id,
                partyName: s.name,
                type: 'credit',
                amount: b.totalAmount,
                description: `Purchase Bill No: ${b.billNumber} (Restored)`,
                referenceId: b._id,
                balanceAfter: s.balance,
                date: b.billDate
            });
            console.log(`  -> Ledger entry created for bill ${b.billNumber}`);
        }
    }
    
    console.log('Done');
    process.exit();
});
