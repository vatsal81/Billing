const mongoose = require('mongoose');

const ledgerEntrySchema = mongoose.Schema({
    partyType: { type: String, enum: ['customer', 'supplier'], required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    partyName: { type: String, required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['credit', 'debit'], required: true }, // credit = added to udhaar, debit = payment received/made
    amount: { type: Number, required: true },
    description: { type: String },
    balanceAfter: { type: Number },
    referenceId: { type: mongoose.Schema.Types.ObjectId } // Bill ID or Purchase ID
}, { timestamps: true });

ledgerEntrySchema.index({ partyId: 1, date: -1 });
ledgerEntrySchema.index({ referenceId: 1 });


module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
