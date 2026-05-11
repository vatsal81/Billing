const mongoose = require('mongoose');
const PurchaseBill = require('../models/PurchaseBill');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const LedgerEntry = require('../models/LedgerEntry');
const { generatePurchaseReportPdf, generateSingleBillPdf } = require('../utils/purchaseReportGenerator');


// @desc    Add a new purchase bill
// @route   POST /api/purchase-bills
// @access  Admin
const addPurchaseBill = async (req, res) => {
    try {
        let body = req.body;
        
        // Handle JSON fields if they come as strings (common with Multer/FormData)
        const items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
        const ewayBillDetails = typeof body.ewayBillDetails === 'string' ? JSON.parse(body.ewayBillDetails) : body.ewayBillDetails;
        
        const {
            billNumber, supplierId, supplierName, supplierGstin, supplierPan, supplierAddress,
            billDate, ewayBillNo,
            transport, lrNo, broker,
            subTotal, igst, cgst, sgst, roundOff, totalAmount, remarks
        } = body;

        // Get file paths from multer
        const billImage = req.files?.['billImage']?.[0]?.path;
        const ewayBillImage = req.files?.['ewayBillImage']?.[0]?.path;


        // Validation for E-way bill system
        if (totalAmount > 49999 && (!ewayBillDetails || !ewayBillDetails.uniqueNo)) {
            return res.status(400).json({ message: 'E-Way Bill Details are mandatory for bills greater than ₹49,999' });
        }

        // Create or update supplier
        let supplier = null;
        if (supplierId) {
            supplier = await Supplier.findById(supplierId);
        } else {
            supplier = await Supplier.findOne({ name: supplierName });
        }
        
        if (!supplier) {
            supplier = await Supplier.create({
                name: supplierName,
                gstin: supplierGstin,
                pan: supplierPan,
                address: supplierAddress
            });
        } else {
            // Update existing supplier if details are provided
            if (supplierGstin) supplier.gstin = supplierGstin;
            if (supplierPan) supplier.pan = supplierPan;
            if (supplierAddress) supplier.address = supplierAddress;
            await supplier.save();
        }

        const purchaseBill = await PurchaseBill.create({
            billNumber,
            supplier: supplier._id,
            supplierName,
            supplierGstin,
            supplierPan,
            supplierAddress,
            billDate,
            ewayBillNo,
            ewayBillDetails,
            transport,
            lrNo,
            broker,
            items,
            subTotal,
            igst,
            cgst,
            sgst,
            roundOff,
            totalAmount,
            remarks: remarks || '',
            billImage,
            ewayBillImage
        });

        // Update stock and sync inventory
        const unpricedProducts = [];
        for (const item of items) {
            let product = await Product.findOne({ name: item.name });

            if (product) {
                product.stockAmount += (Number(item.meters) || Number(item.pcs) || 0);
                product.purchaseRate = Number(item.rate);
                // If the product exists but nameEnglish was empty, update it
                if (!product.nameEnglish && item.nameEnglish) {
                    product.nameEnglish = item.nameEnglish;
                }
                await product.save();
                
                if (!product.price || product.price === 0) {
                    unpricedProducts.push(product);
                }
            } else {
                const newProduct = await Product.create({
                    name: item.name,
                    nameEnglish: item.nameEnglish || '',
                    hsnCode: item.hsnCode,
                    price: 0,
                    purchaseRate: Number(item.rate),
                    stockAmount: (Number(item.meters) || Number(item.pcs) || 0)
                });
                unpricedProducts.push(newProduct);
            }
        }

        // Update Supplier Balance and Create Ledger Entry
        supplier.balance = (Number(supplier.balance) || 0) + Number(totalAmount);
        await supplier.save();

        await LedgerEntry.create({
            partyType: 'supplier',
            partyId: supplier._id,
            partyName: supplier.name,
            type: 'credit',
            amount: totalAmount,
            description: `Purchase Bill No: ${billNumber}`,
            referenceId: purchaseBill._id,
            balanceAfter: supplier.balance
        });

        res.status(201).json({ purchaseBill, unpricedProducts });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


// @desc    Get all purchase bills
// @route   GET /api/purchase-bills
const getPurchaseBills = async (req, res) => {
    try {
        const bills = await PurchaseBill.find().sort({ billDate: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate monthly PDF report
// @route   GET /api/purchase-bills/monthly-pdf
const getMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.query; // e.g., month=4, year=2024

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const bills = await PurchaseBill.find({
            billDate: { $gte: startDate, $lte: endDate }
        }).sort({ billDate: 1 });

        if (bills.length === 0) {
            return res.status(404).json({ message: 'No bills found for this period' });
        }

        const pdfBuffer = await generatePurchaseReportPdf(bills, month, year);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Purchase_Report_${month}_${year}.pdf`,
        });
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const deletePurchaseBill = async (req, res) => {
    try {
        const bill = await PurchaseBill.findById(req.params.id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Reverse stock for each item
        for (const item of bill.items) {
            let product = await Product.findOne({ name: item.name });

            if (product) {
                product.stockAmount -= (Number(item.meters) || Number(item.pcs) || 0);
                await product.save();
            }
        }

        // Reverse Supplier Balance and Delete Ledger Entry
        const supplier = await Supplier.findById(bill.supplier);
        if (supplier) {
            supplier.balance -= Number(bill.totalAmount);
            await supplier.save();
        }
        await LedgerEntry.deleteMany({ referenceId: bill._id });

        await bill.deleteOne();
        res.json({ message: 'Bill deleted and stock/ledger reversed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePurchaseBill = async (req, res) => {
    try {
        const oldBill = await PurchaseBill.findById(req.params.id);
        if (!oldBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        let body = req.body;
        
        // Handle JSON fields if they come as strings
        const items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
        const ewayBillDetails = typeof body.ewayBillDetails === 'string' ? JSON.parse(body.ewayBillDetails) : body.ewayBillDetails;
        
        const {
            billNumber, supplierId, supplierName, supplierGstin, supplierPan, supplierAddress,
            billDate, ewayBillNo,
            transport, lrNo, broker,
            subTotal, igst, cgst, sgst, roundOff, totalAmount, remarks
        } = body;

        // Get file paths from multer
        const billImage = req.files?.['billImage']?.[0]?.path || oldBill.billImage;
        const ewayBillImage = req.files?.['ewayBillImage']?.[0]?.path || oldBill.ewayBillImage;

        // 1. Reverse old stock
        for (const item of oldBill.items) {
            let product = await Product.findOne({ name: item.name });

            if (product) {
                product.stockAmount -= (Number(item.meters) || Number(item.pcs) || 0);
                await product.save();
            }
        }

        // 2. Reverse old supplier balance
        const oldSupplier = await Supplier.findById(oldBill.supplier);
        if (oldSupplier) {
            oldSupplier.balance = (Number(oldSupplier.balance) || 0) - Number(oldBill.totalAmount);
            await oldSupplier.save();
        }

        // 3. Find or Create the current/new supplier
        let currentSupplier = null;
        const trimmedName = supplierName ? supplierName.trim() : '';

        if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
            currentSupplier = await Supplier.findById(supplierId);
        }
        
        if (!currentSupplier && trimmedName) {
            // Try exact match first
            currentSupplier = await Supplier.findOne({ name: trimmedName });
            
            // If not found, try with trailing space (common in this DB)
            if (!currentSupplier) {
                currentSupplier = await Supplier.findOne({ name: trimmedName + ' ' });
            }
            
            // Still not found? Try case-insensitive fuzzy match
            if (!currentSupplier) {
                currentSupplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') } });
            }
        }

        if (!currentSupplier && supplierName) {
            currentSupplier = await Supplier.create({
                name: supplierName,
                gstin: supplierGstin,
                pan: supplierPan,
                address: supplierAddress
            });
        }

        // 3. Update bill fields
        oldBill.supplier = currentSupplier?._id || oldBill.supplier;
        oldBill.billNumber = billNumber || oldBill.billNumber;
        oldBill.supplierName = supplierName || oldBill.supplierName;
        oldBill.supplierGstin = supplierGstin || oldBill.supplierGstin;
        oldBill.supplierPan = supplierPan || oldBill.supplierPan;
        oldBill.supplierAddress = supplierAddress || oldBill.supplierAddress;
        oldBill.billDate = billDate || oldBill.billDate;
        oldBill.ewayBillNo = ewayBillNo || oldBill.ewayBillNo;
        oldBill.ewayBillDetails = ewayBillDetails || oldBill.ewayBillDetails;
        oldBill.transport = transport || oldBill.transport;
        oldBill.lrNo = lrNo || oldBill.lrNo;
        oldBill.broker = broker || oldBill.broker;
        oldBill.items = items || oldBill.items;
        oldBill.subTotal = subTotal || oldBill.subTotal;
        oldBill.igst = igst || oldBill.igst;
        oldBill.cgst = cgst || oldBill.cgst;
        oldBill.sgst = sgst || oldBill.sgst;
        oldBill.roundOff = roundOff || oldBill.roundOff;
        oldBill.totalAmount = totalAmount || oldBill.totalAmount;
        oldBill.remarks = remarks || oldBill.remarks;
        oldBill.billImage = billImage;
        oldBill.ewayBillImage = ewayBillImage;

        await oldBill.save();

        // 4. Apply new stock
        const unpricedProducts = [];
        for (const item of items) {
            let product = await Product.findOne({ name: item.name });

            if (product) {
                product.stockAmount += (Number(item.meters) || Number(item.pcs) || 0);
                product.purchaseRate = item.rate;
                if (!product.nameEnglish && item.nameEnglish) {
                    product.nameEnglish = item.nameEnglish;
                }
                await product.save();
                if (!product.price || product.price === 0) unpricedProducts.push(product);
            } else {
                const newProduct = await Product.create({
                    name: item.name,
                    nameEnglish: item.nameEnglish || '',
                    hsnCode: item.hsnCode,
                    price: 0,
                    purchaseRate: item.rate,
                    stockAmount: (Number(item.meters) || Number(item.pcs) || 0)
                });
                unpricedProducts.push(newProduct);
            }
        }

        // 5. Apply new supplier balance
        if (currentSupplier) {
            currentSupplier.balance = (Number(currentSupplier.balance) || 0) + Number(totalAmount);
            await currentSupplier.save();
        }

        // 6. Re-create Ledger Entry (Delete existing and create fresh to ensure sync)
        await LedgerEntry.deleteMany({ referenceId: oldBill._id });
        
        await LedgerEntry.create({
            partyType: 'supplier',
            partyId: currentSupplier?._id,
            partyName: supplierName.trim(),
            type: 'credit',
            amount: Number(totalAmount),
            description: `Purchase Bill No: ${billNumber} (Updated)`,
            referenceId: oldBill._id,
            balanceAfter: currentSupplier ? Number(currentSupplier.balance) : Number(totalAmount)
        });

        res.json({ purchaseBill: oldBill, unpricedProducts });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getPurchaseBill = async (req, res) => {
    try {
        const id = req.params.id.trim();
        console.log(`[API] Fetching JSON for bill ID: "${id}"`);
        const bill = await PurchaseBill.findById(id);
        
        if (!bill) {
            console.log(`[API] Bill ID ${id} not found. Attempting fallback search by description...`);
            // Fallback: If ID not found, check if we can find a LedgerEntry with this referenceId
            // and extract the bill number from description
            const ledgerEntry = await LedgerEntry.findOne({ referenceId: id });
            if (ledgerEntry && ledgerEntry.description) {
                const match = ledgerEntry.description.match(/No:\s*([^\s(]+)/);
                if (match && match[1]) {
                    const billNo = match[1].trim();
                    console.log(`[API] Fallback: Searching for bill number ${billNo}`);
                    const fallbackBill = await PurchaseBill.findOne({ billNumber: billNo });
                    if (fallbackBill) return res.json(fallbackBill);
                }
            }
            
            console.log(`[API] ERROR: Bill ${id} not found even with fallback.`);
            return res.status(404).json({ message: `Bill with ID ${id} not found` });
        }
        
        res.json(bill);
    } catch (error) {
        console.error(`[API] Fetch error for bill ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
};

const getSingleBillPdf = async (req, res) => {

    try {
        const bill = await PurchaseBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        const pdfBuffer = await generateSingleBillPdf(bill);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=PurchaseBill_${bill.billNumber}.pdf`,
        });
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addPurchaseBill,
    getPurchaseBills,
    getMonthlyReport,
    getSingleBillPdf,
    deletePurchaseBill,
    getPurchaseBill,
    updatePurchaseBill
};
