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
            let product = await Product.findOne({ hsnCode: item.hsnCode });

            if (!product) {
                product = await Product.findOne({ name: item.name });
            }

            if (product) {
                product.stockAmount += (item.meters || item.pcs || 0);
                product.purchaseRate = item.rate;
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
                    purchaseRate: item.rate,
                    stockAmount: (item.meters || item.pcs || 0)
                });
                unpricedProducts.push(newProduct);
            }
        }

        // Update Supplier Balance and Create Ledger Entry
        supplier.balance = (supplier.balance || 0) + totalAmount;
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
            let product = await Product.findOne({ hsnCode: item.hsnCode });
            if (!product) {
                product = await Product.findOne({ name: item.name });
            }

            if (product) {
                product.stockAmount -= (item.meters || item.pcs || 0);
                await product.save();
            }
        }

        // Reverse Supplier Balance and Delete Ledger Entry
        const supplier = await Supplier.findById(bill.supplier);
        if (supplier) {
            supplier.balance -= bill.totalAmount;
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
            let product = await Product.findOne({ hsnCode: item.hsnCode });
            if (!product) product = await Product.findOne({ name: item.name });

            if (product) {
                product.stockAmount -= (Number(item.meters) || Number(item.pcs) || 0);
                await product.save();
            }
        }

        // 2. Reverse old supplier balance
        const supplier = await Supplier.findById(oldBill.supplier);
        if (supplier) {
            supplier.balance -= oldBill.totalAmount;
            await supplier.save();
        }

        // 3. Update bill fields
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
            let product = await Product.findOne({ hsnCode: item.hsnCode });
            if (!product) product = await Product.findOne({ name: item.name });

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
        if (supplier) {
            supplier.balance += Number(totalAmount);
            await supplier.save();
        }

        // 6. Update Ledger Entry
        await LedgerEntry.findOneAndUpdate(
            { referenceId: oldBill._id, type: 'credit' },
            {
                partyName: supplierName,
                amount: totalAmount,
                description: `Purchase Bill No: ${billNumber} (Updated)`,
                balanceAfter: supplier ? supplier.balance : 0
            }
        );

        res.json({ purchaseBill: oldBill, unpricedProducts });
    } catch (error) {
        res.status(400).json({ message: error.message });
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
    updatePurchaseBill
};
