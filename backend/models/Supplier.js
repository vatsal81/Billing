const mongoose = require('mongoose');

const supplierSchema = mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String, default: 'Gujarat' },
    phone: { type: String },
    email: { type: String },
    gstin: { type: String },
    pan: { type: String },
    balance: { type: Number, default: 0 },
    bankName: { type: String },
    accountNo: { type: String },
    branch: { type: String },
    ifsc: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
