const mongoose = require('mongoose');

const billSchema = mongoose.Schema({
    serialNumber: { type: Number },
    invoiceNumber: { type: String },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        hsnCode: String,
        quantity: Number,
        meter: Number, // New field for fabric cut length
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
    
    // New ERP features
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'flat', 'none'], default: 'none' },
    billType: { type: String, enum: ['sale', 'return'], default: 'sale' },

    status: { type: String, default: 'active' }, 
    uniqueInvoiceId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

billSchema.index({ serialNumber: -1 });
billSchema.index({ customer: 1 });
billSchema.index({ createdAt: -1 });


module.exports = mongoose.model('Bill', billSchema);
