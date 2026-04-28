const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const { generateBillPdf } = require('../utils/pdfGenerator');

exports.generateBill = async (req, res) => {
    try {
        const { targetAmount, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone } = req.body;


        
        if (!targetAmount || isNaN(targetAmount)) {
            return res.status(400).json({ message: "Invalid target amount provided" });
        }

        const products = await Product.find({ stockAmount: { $gt: 0 } });
        
        if (products.length === 0) {
            const allProducts = await Product.countDocuments();
            return res.status(400).json({ message: `No stock available. Total products in DB: ${allProducts}` });
        }

        // Select a random number of unique items (6 to 8)
        const targetItemCount = Math.min(products.length, Math.floor(Math.random() * 3) + 6);
        
        // Pick random unique products that fit the target amount
        const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
        
        let selectedItemsMap = {}; 
        let selectedProducts = []; // Keep track of the actual products selected
        let currentSubtotal = 0;
        const targetSubtotal = targetAmount / 1.05;

        // First pass: Fill unique items greedily without exceeding targetSubtotal
        for (const p of shuffledProducts) {
            if (selectedProducts.length < targetItemCount && (currentSubtotal + p.price) <= targetSubtotal) {
                selectedItemsMap[p._id] = {
                    product: p._id,
                    name: p.name,
                    price: p.price,
                    quantity: 1
                };
                selectedProducts.push(p);
                currentSubtotal += p.price;
            }
        }

        // Add more quantities to reach the target accurately
        let attempts = 0;
        while (currentSubtotal < targetSubtotal * 0.99 && attempts < 1000) {
            attempts++;
            
            // Filter products from our selection that can still fit
            const affordableProducts = selectedProducts.filter(p => 
                p.price <= (targetSubtotal * 1.001 - currentSubtotal) && 
                (selectedItemsMap[p._id].quantity < p.stockAmount)
            );

            if (affordableProducts.length === 0) break; // Nothing more can fit
            
            // Pick one randomly from those that fit
            const p = affordableProducts[Math.floor(Math.random() * affordableProducts.length)];
            const item = selectedItemsMap[p._id];

            // Calculate how many more we can add without overshooting
            let maxPossibleAdd = Math.floor((targetSubtotal * 1.001 - currentSubtotal) / p.price);
            if (maxPossibleAdd > (p.stockAmount - item.quantity)) {
                maxPossibleAdd = p.stockAmount - item.quantity;
            }
            
            // Add a small random quantity up to maxPossibleAdd
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
            return res.status(400).json({ message: "Target amount is too low for available products. Please enter a larger amount or add cheaper items to inventory." });
        }

        // Final tax math
        const cgst = currentSubtotal * 0.025;
        const sgst = currentSubtotal * 0.025;
        const preRound = currentSubtotal + cgst + sgst;
        const finalActualTotal = Math.round(preRound);
        const roundOff = finalActualTotal - preRound;

        // Perfect Sequential Numbering: Find the highest existing serial number
        const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
        const nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;

        const bill = await Bill.create({
            serialNumber: nextSerial,
            items: selectedItems,
            totalAmount: currentSubtotal,
            cgst: cgst,
            sgst: sgst,
            roundOff: roundOff,
            actualTotal: finalActualTotal,
            customerName,
            customerNameGujarati,
            customerAddress,
            customerAddressGujarati,
            customerPhone
        });

        // Sync the counter for consistency
        await Counter.findOneAndUpdate(
            { id: 'billId' },
            { $set: { seq: nextSerial } },
            { upsert: true }
        );







        // Update Stock
        for (let item of selectedItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: -item.quantity } });
        }

        // Upsert Customer
        if (customerName) {
            await Customer.findOneAndUpdate(
                { name: customerName },
                { 
                    $inc: { totalSpent: finalActualTotal },
                    $set: { 
                        lastVisit: Date.now(), 
                        address: customerAddress, 
                        addressGujarati: customerAddressGujarati || '',
                        phone: customerPhone,
                        nameGujarati: customerNameGujarati || ''
                    }

                },

                { upsert: true }
            );
        }

        res.status(201).json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generateManualBill = async (req, res) => {
    try {
        const { items, customerName, customerNameGujarati, customerAddress, customerAddressGujarati, customerPhone } = req.body;


        
        let subtotal = 0;
        items.forEach(i => subtotal += (i.price * i.quantity));
        
        const cgst = subtotal * 0.025;
        const sgst = subtotal * 0.025;
        const preRound = subtotal + cgst + sgst;
        const finalTotal = Math.round(preRound);
        const roundOff = finalTotal - preRound;

        // Perfect Sequential Numbering
        const lastBill = await Bill.findOne().sort({ serialNumber: -1 });
        const nextSerial = lastBill ? lastBill.serialNumber + 1 : 1;

        const bill = await Bill.create({
            serialNumber: nextSerial,
            items,
            totalAmount: subtotal,
            cgst,
            sgst,
            roundOff,
            actualTotal: finalTotal,
            customerName,
            customerNameGujarati,
            customerAddress,
            customerAddressGujarati,
            customerPhone
        });

        // Sync the counter
        await Counter.findOneAndUpdate(
            { id: 'billId' },
            { $set: { seq: nextSerial } },
            { upsert: true }
        );



        // Update Stock
        for (let item of items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount: -item.quantity } });
        }

        // Upsert Customer
        if (customerName) {
            await Customer.findOneAndUpdate(
                { name: customerName },
                { 
                    $inc: { totalSpent: finalTotal },
                    $set: { 
                        lastVisit: Date.now(), 
                        address: customerAddress, 
                        addressGujarati: customerAddressGujarati || '',
                        phone: customerPhone,
                        nameGujarati: customerNameGujarati || ''
                    }

                },

                { upsert: true }
            );
        }

        res.status(201).json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBills = async (req, res) => {
    try {
        const bills = await Bill.find().sort({ createdAt: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.voidBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        
        if (bill.status === 'void') return res.status(400).json({ message: "Already void" });

        bill.status = 'void';
        await bill.save();

        // Restore stock
        for (let item of bill.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount : item.quantity } });
        }

        res.json({ message: "Bill voided successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteBill = async (req, res) => {
    try {
        const billToDelete = await Bill.findById(req.params.id);
        if (!billToDelete) return res.status(404).json({ message: "Bill not found" });

        // If not already voided, restore stock before deleting
        if (billToDelete.status !== 'void') {
            for (let item of billToDelete.items) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stockAmount : item.quantity } });
            }
        }

        const serialToDelete = billToDelete.serialNumber;
        await Bill.findByIdAndDelete(req.params.id);

        // Perfect System: If the deleted bill was the latest one, decrement the counter
        const remainingLastBill = await Bill.findOne().sort({ serialNumber: -1 });
        const nextSerial = remainingLastBill ? remainingLastBill.serialNumber + 1 : 1;
        
        await Counter.findOneAndUpdate(
            { id: 'billId' },
            { $set: { seq: remainingLastBill ? remainingLastBill.serialNumber : 0 } }
        );

        res.json({ message: "Bill deleted permanently and book number synced" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



exports.getBillPdf = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: "Bill not found" });

        const settings = await Settings.findOne() || {};
        const pdfBuffer = await generateBillPdf(bill, settings);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=bill_${bill.serialNumber}.pdf`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBookPdf = async (req, res) => {
    try {
        const bookNumber = parseInt(req.params.bookNumber);
        const startSerial = (bookNumber - 1) * 100 + 1;
        const endSerial = bookNumber * 100;

        const bills = await Bill.find({
            serialNumber: { $gte: startSerial, $lte: endSerial }
        }).sort({ serialNumber: 1 });

        if (bills.length === 0) return res.status(404).json({ message: "No bills found for this book" });

        const settings = await Settings.findOne() || {};
        const pdfBuffer = await generateBillPdf(bills, settings);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=BillBook_${bookNumber}.pdf`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
