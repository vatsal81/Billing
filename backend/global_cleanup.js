const mongoose = require('mongoose');
const Supplier = require('./models/Supplier');
const LedgerEntry = require('./models/LedgerEntry');
const PurchaseBill = require('./models/PurchaseBill');

mongoose.connect('mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0')
.then(async () => {
    console.log('Starting Global Name Cleanup...');
    const suppliers = await Supplier.find({});
    for (const s of suppliers) {
        const original = s.name;
        const trimmed = s.name.trim();
        if (original !== trimmed) {
            s.name = trimmed;
            await s.save();
            console.log(`Trimmed Supplier: [${original}] -> [${trimmed}]`);
            
            // Sync all related records to use the trimmed name
            const leRes = await LedgerEntry.updateMany({ partyId: s._id }, { partyName: trimmed });
            console.log(`  Updated ${leRes.modifiedCount} ledger entries`);
            
            const pbRes = await PurchaseBill.updateMany({ $or: [{ supplier: s._id }, { supplierName: original }] }, { supplierName: trimmed });
            console.log(`  Updated ${pbRes.modifiedCount} purchase bills`);
        }
    }
    console.log('Cleanup Complete');
    process.exit();
})
.catch(err => {
    console.error('Cleanup Error:', err);
    process.exit();
});
