const asyncHandler = require('express-async-handler');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const LedgerEntry = require('../models/LedgerEntry');
const { generateBillPdf } = require('../utils/pdfGenerator');

// @desc    Generate a smart bill
// @route   POST /api/bills
// @access  Private
exports.generateBill = asyncHandler(async (req, res) => {
    const { targetAmount, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode } = req.body;

    if (!targetAmount || isNaN(targetAmount)) {
        res.status(400);
        throw new Error("Invalid target amount provided");
    }

    const products = await Product.find({ stockAmount: { $gt: 0 } });
    
    if (products.length === 0) {
        const allProducts = await Product.countDocuments();
        res.status(400);
        throw new Error(`No stock available. Total products in DB: ${allProducts}`);
    }

    const targetItemCount = Math.min(products.length, Math.floor(Math.random() * 3) + 6);
    const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
    
    let selectedItemsMap = {}; 
    let selectedProducts = [];
    let currentSubtotal = 0;
    const targetSubtotal = targetAmount / 1.05;

    for (const p of shuffledProducts) {
        if (selectedProducts.length < targetItemCount && (currentSubtotal + p.price) <= targetSubtotal) {
            const fullName = p.nameEnglish ? `${p.name} (${p.nameEnglish})` : p.name;
            selectedItemsMap[p._id] = {
                product: p._id,
                name: fullName,
                price: p.price,
                quantity: 1
            };
            selectedProducts.push(p);
            currentSubtotal += p.price;
        }
    }

    let attempts = 0;
    while (currentSubtotal < targetSubtotal * 0.99 && attempts < 1000) {
        attempts++;
        const affordableProducts = selectedProducts.filter(p => 
            p.price <= (targetSubtotal * 1.001 - currentSubtotal) && 
            (selectedItemsMap[p._id].quantity < p.stockAmount)
        );

        if (affordableProducts.length === 0) break;
        
        const p = affordableProducts[Math.floor(Math.random() * affordableProducts.length)];
        const item = selectedItemsMap[p._id];

        let maxPossibleAdd = Math.floor((targetSubtotal * 1.001 - currentSubtotal) / p.price);
        if (maxPossibleAdd > (p.stockAmount - item.quantity)) {
            maxPossibleAdd = p.stockAmount - item.quantity;
        }
        
        let addQty = Math.min(maxPossibleAdd, Math.floor(Math.random() * 5) + 1);
        if (addQty > 0) {
            item.quantity += addQty;
            currentSubtotal += (p.price * addQty);
        }
    }

    const selectedItems = Object.values(selectedItemsMap).map(item => ({
        ...item,
        total: item.price * item.quantity
    }));

    if (selectedItems.length === 0) {
        res.status(400);
        throw new Error("Target amount is too low for available products.");
    }

    const cgst = currentSubtotal * 0.025;
    const sgst = currentSubtotal * 0.025;
    const preRound = currentSubtotal + cgst + sgst;
    const finalActualTotal = Math.round(preRound);
    const roundOff = finalActualTotal - preRound;

    const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
    const nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;

    let resolvedCustomerId = null;
    if (customerId || customerName) {
        const query = customerId ? { _id: customerId } : { name: customerName };
        const customer = await Customer.findOneAndUpdate(
            query,
            { 
                $inc: { 
                    totalSpent: finalActualTotal,
                    balance: (paymentMode === 'credit' ? finalActualTotal : 0)
                },
                $set: { 
                    lastVisit: Date.now(), 
                    address: customerAddress, 
                    addressGujarati: customerAddressGujarati || '',
                    phone: customerPhone,
                    nameGujarati: customerNameGujarati || ''
                },
                $setOnInsert: { name: customerName || 'Unknown Customer' }
            },
            { upsert: true, returnDocument: 'after' }
        );
        resolvedCustomerId = customer._id;
    }

    const bill = await Bill.create({
        serialNumber: nextSerial,
        items: selectedItems,
        totalAmount: currentSubtotal,
        cgst: cgst,
        sgst: sgst,
        roundOff: roundOff,
        actualTotal: finalActualTotal,
        customer: resolvedCustomerId,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerAddressGujarati,
        customerPhone,
        paymentMode: paymentMode || 'cash'
    });

    await Counter.findOneAndUpdate(
        { id: 'billId' },
        { $set: { seq: nextSerial } },
        { upsert: true }
    );

    for (let item of selectedItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: -item.quantity } });
    }

    if (resolvedCustomerId && paymentMode === 'credit') {
        const customer = await Customer.findById(resolvedCustomerId);
        await LedgerEntry.create({
            partyType: 'customer',
            partyId: customer._id,
            partyName: customer.name,
            type: 'debit',
            amount: finalActualTotal,
            description: `Credit Sale - Bill #${nextSerial}`,
            referenceId: bill._id,
            balanceAfter: customer.balance
        });
    }

    res.status(201).json(bill);
});

// @desc    Generate a manual bill
// @route   POST /api/bills/manual
// @access  Private
exports.generateManualBill = asyncHandler(async (req, res) => {
    const { items, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode } = req.body;

    let subtotal = 0;
    items.forEach(i => subtotal += (i.price * i.quantity));
    
    const cgst = subtotal * 0.025;
    const sgst = subtotal * 0.025;
    const preRound = subtotal + cgst + sgst;
    const finalTotal = Math.round(preRound);
    const roundOff = finalTotal - preRound;

    const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
    const nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;

    let resolvedCustomerId = null;
    if (customerId || customerName) {
        const query = customerId ? { _id: customerId } : { name: customerName };
        const customer = await Customer.findOneAndUpdate(
            query,
            { 
                $inc: { 
                    totalSpent: finalTotal,
                    balance: (paymentMode === 'credit' ? finalTotal : 0)
                },
                $set: { 
                    lastVisit: Date.now(), 
                    address: customerAddress, 
                    addressGujarati: customerAddressGujarati || '',
                    phone: customerPhone,
                    nameGujarati: customerNameGujarati || ''
                },
                $setOnInsert: { name: customerName || 'Unknown Customer' }
            },
            { upsert: true, returnDocument: 'after' }
        );
        resolvedCustomerId = customer._id;
    }

    const bill = await Bill.create({
        serialNumber: nextSerial,
        items,
        totalAmount: subtotal,
        cgst,
        sgst,
        roundOff,
        actualTotal: finalTotal,
        customer: resolvedCustomerId,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerAddressGujarati,
        customerPhone,
        paymentMode: paymentMode || 'cash'
    });

    await Counter.findOneAndUpdate(
        { id: 'billId' },
        { $set: { seq: nextSerial } },
        { upsert: true }
    );

    for (let item of items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: -item.quantity } });
    }

    if (resolvedCustomerId && paymentMode === 'credit') {
        const customer = await Customer.findById(resolvedCustomerId);
        await LedgerEntry.create({
            partyType: 'customer',
            partyId: customer._id,
            partyName: customer.name,
            type: 'debit',
            amount: finalTotal,
            description: `Manual Credit Sale - Bill #${nextSerial}`,
            referenceId: bill._id,
            balanceAfter: customer.balance
        });
    }

    res.status(201).json(bill);
});

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
exports.getBills = asyncHandler(async (req, res) => {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
});

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
exports.getBillById = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
        res.status(404);
        throw new Error("Bill not found");
    }
    res.json(bill);
});

// @desc    Void a bill
// @route   PUT /api/bills/:id/void
// @access  Private
exports.voidBill = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
        res.status(404);
        throw new Error("Bill not found");
    }
    
    if (bill.status === 'void') {
        res.status(400);
        throw new Error("Already void");
    }

    bill.status = 'void';
    await bill.save();

    for (let item of bill.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount : item.quantity } });
    }

    if (bill.paymentMode === 'credit' && (bill.customer || bill.customerName)) {
        const query = bill.customer ? { _id: bill.customer } : { name: bill.customerName };
        const customer = await Customer.findOneAndUpdate(
            query,
            { $inc: { balance: -bill.actualTotal } },
            { returnDocument: 'after' }
        );
        if (customer) {
            await LedgerEntry.deleteMany({ referenceId: bill._id });
        }
    }

    res.json({ message: "Bill voided successfully" });
});

// @desc    Delete a bill permanently
// @route   DELETE /api/bills/:id
// @access  Private
exports.deleteBill = asyncHandler(async (req, res) => {
    const billToDelete = await Bill.findById(req.params.id);
    if (!billToDelete) {
        res.status(404);
        throw new Error("Bill not found");
    }

    if (billToDelete.status !== 'void') {
        for (let item of billToDelete.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount : item.quantity } });
        }
    }

    await Bill.findByIdAndDelete(req.params.id);

    const remainingLastBill = await Bill.findOne().sort({ serialNumber: -1 });
    await Counter.findOneAndUpdate(
        { id: 'billId' },
        { $set: { seq: remainingLastBill ? remainingLastBill.serialNumber : 0 } }
    );

    if (billToDelete.status !== 'void' && billToDelete.paymentMode === 'credit' && (billToDelete.customer || billToDelete.customerName)) {
        const query = billToDelete.customer ? { _id: billToDelete.customer } : { name: billToDelete.customerName };
        await Customer.findOneAndUpdate(
            query,
            { $inc: { balance: -billToDelete.actualTotal } }
        );
        await LedgerEntry.deleteMany({ referenceId: billToDelete._id });
    }

    res.json({ message: "Bill deleted permanently and book number synced" });
});

// @desc    Get Bill PDF
// @route   GET /api/bills/:id/pdf
// @access  Public (for customer link)
exports.getBillPdf = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
        res.status(404);
        throw new Error("Bill not found");
    }

    const settings = await Settings.findOne() || {};
    const pdfBuffer = await generateBillPdf(bill, settings);

    const isDownload = req.query.download === 'true';
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename=bill_${bill.serialNumber}.pdf`,
        'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
});

// @desc    Get Bill Book PDF
// @route   GET /api/bills/book/:bookNumber/pdf
// @access  Private
exports.getBookPdf = asyncHandler(async (req, res) => {
    const bookNumber = parseInt(req.params.bookNumber);
    const startSerial = (bookNumber - 1) * 100 + 1;
    const endSerial = bookNumber * 100;

    const bills = await Bill.find({
        serialNumber: { $gte: startSerial, $lte: endSerial }
    }).sort({ serialNumber: 1 });

    if (bills.length === 0) {
        res.status(404);
        throw new Error("No bills found for this book");
    }

    const settings = await Settings.findOne() || {};
    const pdfBuffer = await generateBillPdf(bills, settings);

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=BillBook_${bookNumber}.pdf`,
        'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
});
