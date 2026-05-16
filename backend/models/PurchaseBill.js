const mongoose = require('mongoose');

const purchaseBillSchema = mongoose.Schema({
    billNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String, required: true },
    supplierGstin: { type: String },
    supplierPan: { type: String },
    supplierAddress: { type: String },
    
    billDate: { type: Date, required: true },
    ewayBillNo: { type: String }, // Keep for quick reference
    
    ewayBillDetails: {
        uniqueNo: String,
        enteredDate: String,
        enteredBy: String,
        supplierGstin: String,
        placeOfDispatch: String,
        recipientGstin: String,
        placeOfDelivery: String,
        documentNo: String,
        documentDate: String,
        transactionType: String,
        valueOfGoods: Number,
        hsnCode: String,
        reasonForTransportation: String,
        transporter: String
    },
    
    transport: { type: String },
    lrNo: { type: String },
    broker: { type: String },

    items: [{
        productId: String,
        name: String,
        nameEnglish: String,
        hsnCode: String,
        pcs: { type: Number, default: 0 },
        meters: { type: Number, default: 0 },
        rate: Number,
        amount: Number
    }],
    
    subTotal: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    
    remarks: { type: String, default: '' },
    status: { type: String, default: 'completed' },
    billImage: { type: String },
    ewayBillImage: { type: String },
}, { timestamps: true });


module.exports = mongoose.model('PurchaseBill', purchaseBillSchema);
