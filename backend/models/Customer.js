const mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
    name: { type: String, required: true },
    nameGujarati: { type: String, default: '' },
    address: { type: String, default: '' },
    addressGujarati: { type: String, default: '' },

    phone: { type: String, default: '' },

    totalSpent: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
