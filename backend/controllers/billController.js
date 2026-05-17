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

    if (!customerId && !customerName) {
        res.status(400);
        throw new Error("Customer selection is strictly required to generate a bill");
    }

    const products = await Product.find({ stockAmount: { $gt: 0 } });
    
    if (products.length === 0) {
        const allProducts = await Product.countDocuments();
        res.status(400);
        throw new Error(`No stock available. Total products in DB: ${allProducts}`);
    }

    let bestResult = null;
    let closestDiff = Infinity;

    const maxTrials = 5000;
    for (let trial = 0; trial < maxTrials; trial++) {
        const targetItemCount = Math.min(products.length, Math.floor(Math.random() * 3) + 6);
        const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
        
        let selectedItemsMap = {}; 
        let selectedProducts = [];
        let currentSubtotal = 0;
        const targetSubtotal = targetAmount / 1.05;

        for (const p of shuffledProducts) {
            if (selectedProducts.length < targetItemCount && (currentSubtotal + p.price) <= targetSubtotal) {
                selectedItemsMap[p._id] = {
                    product: p._id,
                    name: p.name,
                    price: p.price,
                    hsnCode: p.hsnCode,
                    quantity: 1
                };
                selectedProducts.push(p);
                currentSubtotal += p.price;
            }
        }

        let attempts = 0;
        while (currentSubtotal < targetSubtotal && attempts < 100) {
            attempts++;
            const affordableProducts = selectedProducts.filter(p => 
                p.price <= (targetSubtotal - currentSubtotal) && 
                (selectedItemsMap[p._id].quantity < p.stockAmount)
            );

            if (affordableProducts.length === 0) break;
            
            const p = affordableProducts[Math.floor(Math.random() * affordableProducts.length)];
            const item = selectedItemsMap[p._id];
            
            let maxPossibleAdd = Math.floor((targetSubtotal - currentSubtotal) / p.price);
            if (maxPossibleAdd > (p.stockAmount - item.quantity)) {
                maxPossibleAdd = p.stockAmount - item.quantity;
            }
            
            let addQty = Math.min(maxPossibleAdd, Math.floor(Math.random() * 3) + 1);
            if (addQty > 0) {
                item.quantity += addQty;
                currentSubtotal += (p.price * addQty);
            }
        }

        const remainingGap = targetSubtotal - currentSubtotal;
        if (remainingGap > 0) {
            const finalFillers = products.filter(p => 
                p.price <= remainingGap &&
                (!selectedItemsMap[p._id] || selectedItemsMap[p._id].quantity < p.stockAmount)
            );
            if (finalFillers.length > 0) {
                finalFillers.sort((a, b) => b.price - a.price);
                const p = finalFillers[0];
                if (selectedItemsMap[p._id]) {
                    selectedItemsMap[p._id].quantity += 1;
                } else {
                    selectedItemsMap[p._id] = {
                        product: p._id,
                        name: p.name,
                        price: p.price,
                        hsnCode: p.hsnCode,
                        quantity: 1
                    };
                }
                currentSubtotal += p.price;
            }
        }

        const cgst = currentSubtotal * 0.025;
        const sgst = currentSubtotal * 0.025;
        const preRound = currentSubtotal + cgst + sgst;
        const finalActualTotal = Math.round(preRound);
        const diff = Math.abs(finalActualTotal - targetAmount);

        if (diff < closestDiff) {
            closestDiff = diff;
            bestResult = {
                selectedItems: Object.values(selectedItemsMap).map(item => ({
                    ...item,
                    total: item.price * item.quantity
                })),
                currentSubtotal,
                cgst,
                sgst,
                roundOff: finalActualTotal - preRound,
                finalActualTotal
            };

            if (diff === 0) {
                break;
            }
        }
    }

    if (!bestResult || bestResult.selectedItems.length === 0) {
        res.status(400);
        throw new Error("Target amount is too low for available products.");
    }

    const { selectedItems, currentSubtotal, cgst, sgst, roundOff, finalActualTotal } = bestResult;

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

    const nameParts = (customerName || 'CASH').trim().split(/\s+/);
    let initials = 'CSH';
    if (nameParts.length === 1 && nameParts[0].toUpperCase() !== 'CASH') {
        initials = nameParts[0].substring(0, 2).toUpperCase();
    } else if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    initials = initials.replace(/[^A-Z]/g, '') || 'CSH';

    const dateObj = req.body.billDate ? new Date(req.body.billDate) : new Date();
    const datePart = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth()+1).padStart(2, '0')}${dateObj.getFullYear()}`;
    const bookNo = String(Math.floor((nextSerial - 1) / 100) + 1).padStart(2, '0');
    const billNo = String(((nextSerial - 1) % 100) + 1).padStart(3, '0');
    const payMode = (paymentMode === 'online' ? 'GPAY' : (paymentMode === 'credit' ? 'UDHAR' : 'CASH'));
    const uniqueInvoiceId = `${initials}-BK${bookNo}-B${billNo}-${datePart}-${payMode}`;

    const bill = await Bill.create({
        uniqueInvoiceId,
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
        paymentMode: paymentMode || 'cash',
        createdAt: req.body.billDate ? new Date(req.body.billDate) : undefined
    });

    await Counter.findOneAndUpdate(
        { id: 'billId' },
        { $set: { seq: nextSerial } },
        { upsert: true, returnDocument: 'after' }
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
    const { items, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode, discountAmount, discountType, billType, billDate } = req.body;

    const actualBillType = billType || 'sale';
    const actualDiscountAmount = parseFloat(discountAmount) || 0;
    const actualDiscountType = discountType || 'none';

    let subtotal = 0;
    items.forEach(i => {
        const meter = i.meter ? parseFloat(i.meter) : 1;
        subtotal += (i.price * i.quantity * meter);
    });
    
    // Apply discount
    let discountedSubtotal = subtotal;
    if (actualDiscountType === 'percentage') {
        discountedSubtotal = subtotal - (subtotal * (actualDiscountAmount / 100));
    } else if (actualDiscountType === 'flat') {
        discountedSubtotal = subtotal - actualDiscountAmount;
    }
    if (discountedSubtotal < 0) discountedSubtotal = 0;

    const cgst = discountedSubtotal * 0.025;
    const sgst = discountedSubtotal * 0.025;
    const preRound = discountedSubtotal + cgst + sgst;
    
    let roundOff = Math.round(preRound) - preRound;
    if (req.body.roundOff !== undefined && req.body.roundOff !== null && req.body.roundOff !== '') {
        const parsedOverride = parseFloat(req.body.roundOff);
        if (!isNaN(parsedOverride)) {
            roundOff = parsedOverride;
        }
    }
    const finalTotal = Math.round(preRound + roundOff);

    const impactAmount = actualBillType === 'return' ? -finalTotal : finalTotal;

    const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
    const nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;

    let resolvedCustomerId = null;
    if (customerId || customerName) {
        const query = customerId ? { _id: customerId } : { name: customerName };
        const customer = await Customer.findOneAndUpdate(
            query,
            { 
                $inc: { 
                    totalSpent: impactAmount,
                    balance: (paymentMode === 'credit' ? impactAmount : 0)
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

    const nameParts = (customerName || 'CASH').trim().split(/\s+/);
    let initials = 'CSH';
    if (nameParts.length === 1 && nameParts[0].toUpperCase() !== 'CASH') {
        initials = nameParts[0].substring(0, 2).toUpperCase();
    } else if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    initials = initials.replace(/[^A-Z]/g, '') || 'CSH';

    const dateObj = billDate ? new Date(billDate) : new Date();
    const datePart = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth()+1).padStart(2, '0')}${dateObj.getFullYear()}`;
    const bookNo = String(Math.floor((nextSerial - 1) / 100) + 1).padStart(2, '0');
    const billNo = String(((nextSerial - 1) % 100) + 1).padStart(3, '0');
    const payMode = (paymentMode === 'online' ? 'GPAY' : (paymentMode === 'credit' ? 'UDHAR' : 'CASH'));
    const uniqueInvoiceId = `${initials}-BK${bookNo}-B${billNo}-${datePart}-${payMode}`;

    const bill = await Bill.create({
        uniqueInvoiceId,
        serialNumber: nextSerial,
        items,
        totalAmount: subtotal,
        discountAmount: actualDiscountAmount,
        discountType: actualDiscountType,
        billType: actualBillType,
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
        paymentMode: paymentMode || 'cash',
        createdAt: billDate ? new Date(billDate) : undefined
    });

    await Counter.findOneAndUpdate(
        { id: 'billId' },
        { $set: { seq: nextSerial } },
        { upsert: true, returnDocument: 'after' }
    );

    for (let item of items) {
        if (item.product) {
            const stockImpact = actualBillType === 'return' ? item.quantity : -item.quantity;
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: stockImpact } });
        }
    }

    if (resolvedCustomerId && paymentMode === 'credit') {
        const customer = await Customer.findById(resolvedCustomerId);
        await LedgerEntry.create({
            partyType: 'customer',
            partyId: customer._id,
            partyName: customer.name,
            type: actualBillType === 'return' ? 'credit' : 'debit',
            amount: finalTotal,
            description: `Manual ${actualBillType === 'return' ? 'Sales Return' : 'Credit Sale'} - Bill #${nextSerial}`,
            referenceId: bill._id,
            balanceAfter: customer.balance
        });
    }

    res.status(201).json(bill);
});

// @desc    Update an existing manual bill
// @route   PUT /api/bills/:id
// @access  Private
exports.updateManualBill = asyncHandler(async (req, res) => {
    const { items, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode, discountAmount, discountType, billType, billDate } = req.body;
    const billId = req.params.id;

    const oldBill = await Bill.findById(billId);
    if (!oldBill) {
        res.status(404);
        throw new Error("Bill not found");
    }

    // 1. Reverse old stock impacts
    if (oldBill.status !== 'void') {
        for (let item of oldBill.items) {
            if (item.product) {
                const revertQty = oldBill.billType === 'return' ? -item.quantity : item.quantity;
                await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: revertQty } });
            }
        }
    }

    // 2. Reverse old customer balance and spendings
    if (oldBill.status !== 'void' && (oldBill.customer || oldBill.customerName)) {
        const query = oldBill.customer ? { _id: oldBill.customer } : { name: oldBill.customerName };
        const oldImpact = oldBill.billType === 'return' ? -oldBill.actualTotal : oldBill.actualTotal;
        await Customer.findOneAndUpdate(
            query,
            { 
                $inc: { 
                    totalSpent: -oldImpact,
                    balance: (oldBill.paymentMode === 'credit' ? -oldImpact : 0)
                }
            }
        );
        // Clear old ledger entries
        await LedgerEntry.deleteMany({ referenceId: oldBill._id });
    }

    // 3. Compute new totals
    const actualBillType = billType || 'sale';
    const actualDiscountAmount = parseFloat(discountAmount) || 0;
    const actualDiscountType = discountType || 'none';

    let subtotal = 0;
    items.forEach(i => {
        const meter = i.meter ? parseFloat(i.meter) : 1;
        subtotal += (i.price * i.quantity * meter);
    });
    
    // Apply discount
    let discountedSubtotal = subtotal;
    if (actualDiscountType === 'percentage') {
        discountedSubtotal = subtotal - (subtotal * (actualDiscountAmount / 100));
    } else if (actualDiscountType === 'flat') {
        discountedSubtotal = subtotal - actualDiscountAmount;
    }
    if (discountedSubtotal < 0) discountedSubtotal = 0;

    const cgst = discountedSubtotal * 0.025;
    const sgst = discountedSubtotal * 0.025;
    const preRound = discountedSubtotal + cgst + sgst;
    
    let roundOff = Math.round(preRound) - preRound;
    if (req.body.roundOff !== undefined && req.body.roundOff !== null && req.body.roundOff !== '') {
        const parsedOverride = parseFloat(req.body.roundOff);
        if (!isNaN(parsedOverride)) {
            roundOff = parsedOverride;
        }
    }
    const finalTotal = Math.round(preRound + roundOff);

    const newImpactAmount = actualBillType === 'return' ? -finalTotal : finalTotal;

    // 4. Update customer spent and balance with new totals
    let resolvedCustomerId = null;
    if (customerId || customerName) {
        const query = customerId ? { _id: customerId } : { name: customerName };
        const customer = await Customer.findOneAndUpdate(
            query,
            { 
                $inc: { 
                    totalSpent: newImpactAmount,
                    balance: (paymentMode === 'credit' ? newImpactAmount : 0)
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

    // 5. Update the bill fields
    oldBill.items = items;
    oldBill.totalAmount = subtotal;
    oldBill.discountAmount = actualDiscountAmount;
    oldBill.discountType = actualDiscountType;
    oldBill.billType = actualBillType;
    oldBill.cgst = cgst;
    oldBill.sgst = sgst;
    oldBill.roundOff = roundOff;
    oldBill.actualTotal = finalTotal;
    oldBill.customer = resolvedCustomerId;
    oldBill.customerName = customerName;
    oldBill.customerNameGujarati = customerNameGujarati;
    oldBill.customerAddress = customerAddress;
    oldBill.customerAddressGujarati = customerAddressGujarati;
    oldBill.customerPhone = customerPhone;
    oldBill.paymentMode = paymentMode || 'cash';
    if (billDate) oldBill.createdAt = new Date(billDate);
    oldBill.status = 'active'; // force reactivate if it was void

    const updatedBill = await oldBill.save();

    // 6. Apply new stock impacts
    for (let item of items) {
        if (item.product) {
            const stockImpact = actualBillType === 'return' ? item.quantity : -item.quantity;
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: stockImpact } });
        }
    }

    // 7. Create new ledger entry if credit
    if (resolvedCustomerId && paymentMode === 'credit') {
        const customer = await Customer.findById(resolvedCustomerId);
        await LedgerEntry.create({
            partyType: 'customer',
            partyId: customer._id,
            partyName: customer.name,
            type: actualBillType === 'return' ? 'credit' : 'debit',
            amount: finalTotal,
            description: `Manual Edit ${actualBillType === 'return' ? 'Sales Return' : 'Credit Sale'} - Bill #${oldBill.serialNumber}`,
            referenceId: updatedBill._id,
            balanceAfter: customer.balance
        });
    }

    res.json(updatedBill);
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
        { $set: { seq: remainingLastBill ? remainingLastBill.serialNumber : 0 } },
        { returnDocument: 'after' }
    );

    if (billToDelete.status !== 'void' && billToDelete.paymentMode === 'credit' && (billToDelete.customer || billToDelete.customerName)) {
        const query = billToDelete.customer ? { _id: billToDelete.customer } : { name: billToDelete.customerName };
        await Customer.findOneAndUpdate(
            query,
            { $inc: { balance: -billToDelete.actualTotal } },
            { returnDocument: 'after' }
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
