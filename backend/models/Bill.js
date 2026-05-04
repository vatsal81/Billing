const mongoose = require('mongoose');

const billSchema = mongoose.Schema({
    serialNumber: { type: Number },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        hsnCode: String,
        quantity: Number,
        total: Number
    }],
    totalAmount: { type: Number, required: true },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    actualTotal: { type: Number, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerNameGujarati: { type: String },
    customerAddress: { type: String },
    customerAddressGujarati: { type: String },


    customerPhone: { type: String },
    paymentMode: { type: String, enum: ['cash', 'online', 'credit'], default: 'cash' },
    status: { type: String, default: 'active' }, 
}, { timestamps: true });

billSchema.index({ serialNumber: -1 });
billSchema.index({ customer: 1 });
billSchema.index({ createdAt: -1 });


module.exports = mongoose.model('Bill', billSchema);
