const asyncHandler = require('express-async-handler');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const LedgerEntry = require('../models/LedgerEntry');
const { generateBillPdf } = require('../utils/pdfGenerator');

const generateUniqueInvoiceId = (customerName, billDate, invoiceNumber, serialNumber, paymentMode) => {
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

    let val = serialNumber || 1;
    if (invoiceNumber) {
        const match = String(invoiceNumber).match(/\d+$/);
        if (match) {
            const parsed = parseInt(match[0], 10);
            if (!isNaN(parsed)) val = parsed;
        } else {
            const parsedAll = parseInt(String(invoiceNumber).replace(/\D/g, ''), 10);
            if (!isNaN(parsedAll)) val = parsedAll;
        }
    }
    const book = Math.floor((val - 1) / 100) + 1;
    const num = ((val - 1) % 100) + 1;
    const bookNo = String(book).padStart(2, '0');
    const billNo = String(num).padStart(3, '0');

    const payMode = (paymentMode === 'online' ? 'GPAY' : (paymentMode === 'credit' ? 'UDHAR' : 'CASH'));
    return `${initials}-BK${bookNo}-B${billNo}-${datePart}-${payMode}`;
};

const getRealisticBillingParams = (targetAmount) => {
    if (targetAmount < 300) {
        return {
            minItems: 1,
            maxItems: 2,
            maxQty: 3,
            minProductPrice: 10,
            maxProductPrice: 280
        };
    } else if (targetAmount < 800) {
        return {
            minItems: 2,
            maxItems: 3,
            maxQty: 4,
            minProductPrice: 30,
            maxProductPrice: 600
        };
    } else if (targetAmount < 2000) {
        return {
            minItems: 4,
            maxItems: 4,
            maxQty: 5,
            minProductPrice: 50,
            maxProductPrice: 1000
        };
    } else if (targetAmount < 5000) {
        return {
            minItems: 4,
            maxItems: 5,
            maxQty: 6,
            minProductPrice: 80,
            maxProductPrice: 1500
        };
    } else if (targetAmount < 8000) {
        return {
            minItems: 5,
            maxItems: 5,
            maxQty: 8,
            minProductPrice: 100,
            maxProductPrice: 2000
        };
    } else if (targetAmount < 15000) {
        return {
            minItems: 6,
            maxItems: 6,
            maxQty: 10,
            minProductPrice: 120,
            maxProductPrice: 3000
        };
    } else {
        const baseQty = 8;
        const additionalQty = Math.ceil((targetAmount - 15000) / 1500);
        const maxQty = baseQty + additionalQty;

        return {
            minItems: 6,
            maxItems: 7,
            maxQty: Math.max(maxQty, 12),
            minProductPrice: 150,
            maxProductPrice: 5000
        };
    }
};

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

    const products = await Product.find({ stockAmount: { $gte: 1 } });
    
    if (products.length === 0) {
        const allProducts = await Product.countDocuments();
        res.status(400);
        throw new Error(`No stock available (minimum 1 unit required). Total products in DB: ${allProducts}`);
    }

    const params = getRealisticBillingParams(targetAmount);

    // Filter candidate products based on target price parameters to ensure high realism
    let candidateProducts = products.filter(p => {
        const unitCost = p.price;
        return unitCost >= params.minProductPrice && unitCost <= params.maxProductPrice;
    });

    // Fallback if not enough matching products exist
    if (candidateProducts.length < params.minItems) {
        candidateProducts = products;
    }

    const targetSubtotal = targetAmount * 0.9524; // User's precise inclusive subtotal formula (-4.76%)
    let bestResult = null;
    let closestDiff = Infinity;

    const maxTrials = 5000;
    for (let trial = 0; trial < maxTrials; trial++) {
        // Relax constraints in the second half of trials if we haven't found a perfect match
        const relax = trial > 2500 && closestDiff > 10;
        
        const maxQty = relax ? Math.max(params.maxQty * 2, 20) : params.maxQty;
        
        let pool = candidateProducts;
        if (relax || pool.length < params.minItems) {
            pool = products;
        }

        const minItems = relax ? Math.max(1, params.minItems - 1) : params.minItems;
        const maxItems = relax ? params.maxItems + 2 : params.maxItems;
        
        const targetItemCount = Math.min(
            pool.length, 
            Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems
        );
        
        const shuffledProducts = [...pool].sort(() => 0.5 - Math.random());
        
        let selectedItemsMap = {}; 
        let selectedProducts = [];
        let currentSubtotal = 0;

        for (const p of shuffledProducts) {
            const hasPiece = p.pieceLength && p.pieceLength > 0;
            const unitCost = p.price;
            if (selectedProducts.length < targetItemCount && (currentSubtotal + unitCost) <= targetSubtotal) {
                selectedItemsMap[p._id] = {
                    product: p._id,
                    name: p.nameEnglish || p.name,
                    price: hasPiece ? Math.round((p.price / p.pieceLength) * 100) / 100 : p.price,
                    purchaseRate: p.purchaseRate,
                    hsnCode: p.hsnCode,
                    meter: hasPiece ? p.pieceLength : undefined,
                    quantity: 1
                };
                selectedProducts.push(p);
                currentSubtotal += unitCost;
            }
        }

        let attempts = 0;
        while (currentSubtotal < targetSubtotal && attempts < 100) {
            attempts++;
            const affordableProducts = selectedProducts.filter(p => {
                const unitCost = p.price;
                const currentQty = selectedItemsMap[p._id].quantity;
                return unitCost <= (targetSubtotal - currentSubtotal) && 
                       (currentQty < Math.floor(p.stockAmount)) &&
                       (currentQty < maxQty);
            });

            if (affordableProducts.length === 0) break;
            
            const p = affordableProducts[Math.floor(Math.random() * affordableProducts.length)];
            const item = selectedItemsMap[p._id];
            const unitCost = p.price;
            
            let maxPossibleAdd = Math.floor((targetSubtotal - currentSubtotal) / unitCost);
            if (maxPossibleAdd > (Math.floor(p.stockAmount) - item.quantity)) {
                maxPossibleAdd = Math.floor(p.stockAmount) - item.quantity;
            }
            if (maxPossibleAdd > (maxQty - item.quantity)) {
                maxPossibleAdd = maxQty - item.quantity;
            }
            
            let addQty = Math.min(maxPossibleAdd, Math.floor(Math.random() * 3) + 1);
            if (addQty > 0) {
                item.quantity += addQty;
                currentSubtotal += (unitCost * addQty);
            }
        }

        const remainingGap = targetSubtotal - currentSubtotal;
        if (remainingGap > 0) {
            const finalFillers = pool.filter(p => {
                const unitCost = p.price;
                const isAlreadySelected = !!selectedItemsMap[p._id];
                const currentQty = isAlreadySelected ? selectedItemsMap[p._id].quantity : 0;
                
                // Avoid adding new unique items if we have already hit maxItems count limit
                const canAddUniqueItem = Object.keys(selectedItemsMap).length < (relax ? maxItems : params.maxItems);
                if (!isAlreadySelected && !canAddUniqueItem) {
                    return false;
                }

                return unitCost <= remainingGap &&
                       (currentQty < Math.floor(p.stockAmount) && currentQty < maxQty);
            });
            if (finalFillers.length > 0) {
                finalFillers.sort((a, b) => b.price - a.price);
                const p = finalFillers[0];
                const hasPiece = p.pieceLength && p.pieceLength > 0;
                const unitCost = p.price;
                if (selectedItemsMap[p._id]) {
                    selectedItemsMap[p._id].quantity += 1;
                } else {
                    selectedItemsMap[p._id] = {
                        product: p._id,
                        name: p.nameEnglish || p.name,
                        price: hasPiece ? Math.round((p.price / p.pieceLength) * 100) / 100 : p.price,
                        purchaseRate: p.purchaseRate,
                        hsnCode: p.hsnCode,
                        meter: hasPiece ? p.pieceLength : undefined,
                        quantity: 1
                    };
                }
                currentSubtotal += unitCost;
            }
        }

        const selectedItems = Object.values(selectedItemsMap);
        const selectedItemsCount = selectedItems.length;

        // Strict enforce of target item count boundaries
        const finalMinItems = relax ? minItems : params.minItems;
        const finalMaxItems = relax ? maxItems : params.maxItems;

        if (selectedItemsCount < finalMinItems || selectedItemsCount > finalMaxItems) {
            continue;
        }

        const diff = Math.abs(targetSubtotal - currentSubtotal);

        if (diff < closestDiff) {
            closestDiff = diff;
            const cgst = currentSubtotal * 0.025;
            const sgst = currentSubtotal * 0.025;
            const preRound = currentSubtotal + cgst + sgst;

            bestResult = {
                selectedItems: selectedItems.map(item => ({
                    ...item,
                    total: Math.round(item.price * item.quantity * (item.meter || 1) * 100) / 100
                })),
                currentSubtotal,
                cgst: Number(cgst.toFixed(2)),
                sgst: Number(sgst.toFixed(2)),
                roundOff: Number((targetAmount - preRound).toFixed(2)),
                finalActualTotal: targetAmount
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

    const uniqueInvoiceId = generateUniqueInvoiceId(customerName, req.body.billDate, null, nextSerial, paymentMode);

    const bill = await Bill.create({
        uniqueInvoiceId,
        serialNumber: nextSerial,
        invoiceNumber: String(nextSerial).padStart(3, '0'),
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
            description: `Credit Sale - Bill #${bill.invoiceNumber || String(nextSerial).padStart(3, '0')}`,
            referenceId: bill._id,
            balanceAfter: customer.balance,
            createdAt: bill.createdAt
        });
    }

    res.status(201).json(bill);
});

// @desc    Generate a manual bill
// @route   POST /api/bills/manual
// @access  Private
exports.generateManualBill = asyncHandler(async (req, res) => {
    console.log("[DEBUG] generateManualBill req.body:", req.body);
    const { items, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode, discountAmount, discountType, billType, billDate, invoiceNumber } = req.body;

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
    if (req.body.roundOff !== undefined && req.body.roundOff !== null) {
        const parsedOverride = parseFloat(req.body.roundOff);
        if (!isNaN(parsedOverride)) {
            roundOff = parsedOverride;
        }
    }
    const finalTotal = Math.round(preRound + roundOff);

    const impactAmount = actualBillType === 'return' ? -finalTotal : finalTotal;

    const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
    let nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;
    if (invoiceNumber) {
        const parsed = parseInt(String(invoiceNumber).replace(/\D/g, ''), 10);
        if (!isNaN(parsed)) nextSerial = parsed;
    }

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

    // Fetch product details for each item to get the purchaseRate
    const resolvedItems = await Promise.all(items.map(async (item) => {
        let pRate = 0;
        if (item.product) {
            const prod = await Product.findById(item.product);
            if (prod) {
                const hasPiece = prod.pieceLength && prod.pieceLength > 0;
                pRate = prod.purchaseRate;
            }
        }
        return {
            ...item,
            purchaseRate: pRate
        };
    }));

    const uniqueInvoiceId = generateUniqueInvoiceId(
        customerName,
        billDate,
        invoiceNumber || String(nextSerial).padStart(3, '0'),
        nextSerial,
        paymentMode
    );

    const bill = await Bill.create({
        uniqueInvoiceId,
        serialNumber: nextSerial,
        invoiceNumber: invoiceNumber || String(nextSerial).padStart(3, '0'),
        items: resolvedItems,
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
            const itemQty = item.quantity * (item.meter || 1);
            const stockImpact = actualBillType === 'return' ? itemQty : -itemQty;
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
            description: `Manual ${actualBillType === 'return' ? 'Sales Return' : 'Credit Sale'} - Bill #${bill.invoiceNumber || String(nextSerial).padStart(3, '0')}`,
            referenceId: bill._id,
            balanceAfter: customer.balance,
            createdAt: bill.createdAt
        });
    }

    res.status(201).json(bill);
});

// @desc    Update an existing manual bill
// @route   PUT /api/bills/:id
// @access  Private
exports.updateManualBill = asyncHandler(async (req, res) => {
    console.log("[DEBUG] updateManualBill req.body:", req.body);
    const { items, customerId, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone, paymentMode, discountAmount, discountType, billType, billDate, invoiceNumber } = req.body;
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
                const itemQty = item.quantity * (item.meter || 1);
                const revertQty = oldBill.billType === 'return' ? -itemQty : itemQty;
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
    if (req.body.roundOff !== undefined && req.body.roundOff !== null) {
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
    // Fetch product details for each item to get the purchaseRate
    const resolvedItems = await Promise.all(items.map(async (item) => {
        let pRate = 0;
        if (item.product) {
            const prod = await Product.findById(item.product);
            if (prod) {
                const hasPiece = prod.pieceLength && prod.pieceLength > 0;
                pRate = prod.purchaseRate;
            }
        }
        return {
            ...item,
            purchaseRate: pRate
        };
    }));

    oldBill.items = resolvedItems;
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
    if (invoiceNumber !== undefined) {
        oldBill.invoiceNumber = invoiceNumber;
        const parsed = parseInt(String(invoiceNumber).replace(/\D/g, ''), 10);
        if (!isNaN(parsed)) oldBill.serialNumber = parsed;
    }
    if (billDate) {
        oldBill.createdAt = new Date(billDate);
    }
    oldBill.uniqueInvoiceId = generateUniqueInvoiceId(customerName, oldBill.createdAt, oldBill.invoiceNumber, oldBill.serialNumber, oldBill.paymentMode);
    oldBill.status = 'active'; // force reactivate if it was void

    const updatedBill = await oldBill.save();
    
    // Force direct DB update to bypass Mongoose timestamp plugin overriding createdAt
    if (billDate) {
        await Bill.collection.updateOne(
            { _id: oldBill._id },
            { $set: { createdAt: new Date(billDate) } }
        );
        updatedBill.createdAt = new Date(billDate);
    }

    // 6. Apply new stock impacts
    for (let item of items) {
        if (item.product) {
            const itemQty = item.quantity * (item.meter || 1);
            const stockImpact = actualBillType === 'return' ? itemQty : -itemQty;
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
            description: `Manual Edit ${actualBillType === 'return' ? 'Sales Return' : 'Credit Sale'} - Bill #${updatedBill.invoiceNumber || String(oldBill.serialNumber).padStart(3, '0')}`,
            referenceId: updatedBill._id,
            balanceAfter: customer.balance,
            createdAt: updatedBill.createdAt
        });
    }

    res.json(updatedBill);
});

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
exports.getBills = asyncHandler(async (req, res) => {
    const bills = await Bill.find().populate('items.product').sort({ createdAt: -1 });
    res.json(bills);
});

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
exports.getBillById = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id).populate('items.product');
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

    const multiplier = bill.billType === 'return' ? -1 : 1;
    for (let item of bill.items) {
        if (item.product) {
            const itemQty = item.quantity * (item.meter || 1);
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: itemQty * multiplier } });
        }
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
        const multiplier = billToDelete.billType === 'return' ? -1 : 1;
        for (let item of billToDelete.items) {
            if (item.product) {
                const itemQty = item.quantity * (item.meter || 1);
                await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: itemQty * multiplier } });
            }
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
