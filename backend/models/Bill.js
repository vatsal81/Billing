const mongoose = require('mongoose');

const billSchema = mongoose.Schema({
    serialNumber: { type: Number },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        total: Number
    }],
    totalAmount: { type: Number, required: true },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    actualTotal: { type: Number, required: true },
    customerName: { type: String },
    customerNameGujarati: { type: String },
    customerAddress: { type: String },
    customerAddressGujarati: { type: String },


    customerPhone: { type: String },
    status: { type: String, default: 'active' }, 
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
