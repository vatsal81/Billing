const mongoose = require('mongoose');
const PurchaseBill = require('../models/PurchaseBill');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const LedgerEntry = require('../models/LedgerEntry');
const { generatePurchaseReportPdf, generateSingleBillPdf } = require('../utils/purchaseReportGenerator');

const generateUniquePurchaseBillId = (supplierName, billDate, billNumber) => {
    const nameParts = (supplierName || 'SUPPLIER').trim().split(/\s+/);
    let initials = 'SUP';
    if (nameParts.length === 1 && nameParts[0].toUpperCase() !== 'SUPPLIER') {
        initials = nameParts[0].substring(0, 3).toUpperCase();
    } else if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    initials = initials.replace(/[^A-Z]/g, '') || 'SUP';

    const dateObj = billDate ? new Date(billDate) : new Date();
    const datePart = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth()+1).padStart(2, '0')}${dateObj.getFullYear()}`;

    const cleanBillNo = String(billNumber || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `PUR-${initials}-${cleanBillNo}-${datePart}`;
};


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
            subTotal, discountPercent, discountAmount, igst, cgst, sgst, roundOff, totalAmount, remarks
        } = body;

        // Get file paths from multer
        const uploadedBillImages = req.files?.['billImages']?.map(file => file.path) || [];
        const singleBillImage = req.files?.['billImage']?.[0]?.path;
        
        // Combine them (or use whichever is present)
        const billImages = uploadedBillImages.length > 0 ? uploadedBillImages : (singleBillImage ? [singleBillImage] : []);
        // Set first image for single image field backwards compatibility
        const billImage = billImages[0] || null;

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

        const uniqueBillId = generateUniquePurchaseBillId(supplierName, billDate, billNumber);

        // Check if duplicate purchase bill already exists
        const existingBill = await PurchaseBill.findOne({ uniqueBillId });
        if (existingBill) {
            return res.status(400).json({ message: `A purchase bill with Invoice No: ${billNumber} from ${supplierName} on this date already exists.` });
        }

        const purchaseBill = await PurchaseBill.create({
            billNumber,
            uniqueBillId,
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
            discountPercent,
            discountAmount,
            igst,
            cgst,
            sgst,
            roundOff,
            totalAmount,
            remarks: remarks || '',
            billImage,
            billImages,
            ewayBillImage
        });

        // Update stock and sync inventory
        const unpricedProducts = [];
        const itemsWithIds = [];
        
        for (const item of items) {
            const nameToSearch = (item.name || '').trim();
            const nameEnglishToSearch = (item.nameEnglish || '').trim();
            
            let product = null;
            if (item.productId) {
                product = await Product.findOne({ productId: item.productId });
            }
            if (!product && nameToSearch) {
                product = await Product.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${nameToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                        { nameEnglish: { $regex: new RegExp(`^${nameToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    ]
                });
            }
            if (!product && nameEnglishToSearch) {
                product = await Product.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${nameEnglishToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                        { nameEnglish: { $regex: new RegExp(`^${nameEnglishToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    ]
                });
            }

            const markupPrice = Math.round((Number(item.rate) * 1.30) / 10) * 10;

            if (product) {
                product.stockAmount += (Number(item.meters) || Number(item.pcs) || 0);
                product.purchaseRate = Number(item.rate);
                product.price = markupPrice; // Set 30% profit markup!
                product.lastSupplier = supplierName;
                product.lastInvoice = billNumber;
                if (!product.nameEnglish && item.nameEnglish) {
                    product.nameEnglish = item.nameEnglish;
                }
                await product.save();
                
                itemsWithIds.push({ ...item, productId: product.productId });
            } else {
                const newProduct = await Product.create({
                    name: item.name,
                    nameEnglish: item.nameEnglish || '',
                    hsnCode: item.hsnCode,
                    price: markupPrice, // Set 30% profit markup!
                    purchaseRate: Number(item.rate),
                    stockAmount: (Number(item.meters) || Number(item.pcs) || 0),
                    lastSupplier: supplierName,
                    lastInvoice: billNumber
                });
                itemsWithIds.push({ ...item, productId: newProduct.productId });
            }
        }

        // Update the bill with items that have product IDs
        purchaseBill.items = itemsWithIds;
        await purchaseBill.save();

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
            subTotal, discountPercent, discountAmount, igst, cgst, sgst, roundOff, totalAmount, remarks
        } = body;

        // Parse existing retained images
        let retainedImages = [];
        if (body.existingBillImages) {
            try {
                retainedImages = typeof body.existingBillImages === 'string' ? JSON.parse(body.existingBillImages) : body.existingBillImages;
            } catch (e) {
                console.error("Error parsing existingBillImages:", e);
            }
        } else {
            // Fallback for older or other requests
            retainedImages = oldBill.billImages || (oldBill.billImage ? [oldBill.billImage] : []);
        }

        // Get new files from multer
        const newUploadedBillImages = req.files?.['billImages']?.map(file => file.path) || [];
        const newSingleBillImage = req.files?.['billImage']?.[0]?.path;
        
        const newImages = newUploadedBillImages.length > 0 ? newUploadedBillImages : (newSingleBillImage ? [newSingleBillImage] : []);

        // Combine retained and new files
        const billImages = [...retainedImages, ...newImages];
        const billImage = billImages[0] || null;

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

        const newSupplierName = supplierName || oldBill.supplierName;
        const newBillDate = billDate || oldBill.billDate;
        const newBillNumber = billNumber || oldBill.billNumber;
        const uniqueBillId = generateUniquePurchaseBillId(newSupplierName, newBillDate, newBillNumber);

        // Check if duplicate purchase bill already exists with a different ID
        const existingBill = await PurchaseBill.findOne({ uniqueBillId, _id: { $ne: oldBill._id } });
        if (existingBill) {
            return res.status(400).json({ message: `A purchase bill with Invoice No: ${newBillNumber} from ${newSupplierName} on this date already exists.` });
        }

        // 3. Update bill fields
        oldBill.uniqueBillId = uniqueBillId;
        oldBill.supplier = currentSupplier?._id || oldBill.supplier;
        oldBill.billNumber = newBillNumber;
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
        oldBill.discountPercent = discountPercent !== undefined ? discountPercent : oldBill.discountPercent;
        oldBill.discountAmount = discountAmount !== undefined ? discountAmount : oldBill.discountAmount;
        oldBill.igst = igst || oldBill.igst;
        oldBill.cgst = cgst || oldBill.cgst;
        oldBill.sgst = sgst || oldBill.sgst;
        oldBill.roundOff = roundOff || oldBill.roundOff;
        oldBill.totalAmount = totalAmount || oldBill.totalAmount;
        oldBill.remarks = remarks || oldBill.remarks;
        oldBill.billImage = billImage;
        oldBill.billImages = billImages;
        oldBill.ewayBillImage = ewayBillImage;

        // 4. Apply new stock
        const itemsWithIds = [];
        for (const item of items) {
            const nameToSearch = (item.name || '').trim();
            const nameEnglishToSearch = (item.nameEnglish || '').trim();
            
            let product = null;
            if (item.productId) {
                product = await Product.findOne({ productId: item.productId });
            }
            if (!product && nameToSearch) {
                product = await Product.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${nameToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                        { nameEnglish: { $regex: new RegExp(`^${nameToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    ]
                });
            }
            if (!product && nameEnglishToSearch) {
                product = await Product.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${nameEnglishToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                        { nameEnglish: { $regex: new RegExp(`^${nameEnglishToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    ]
                });
            }

            const markupPrice = Math.round((Number(item.rate) * 1.30) / 10) * 10;

            if (product) {
                product.stockAmount += (Number(item.meters) || Number(item.pcs) || 0);
                product.purchaseRate = Number(item.rate);
                product.price = markupPrice; // Set 30% profit markup!
                product.lastSupplier = supplierName;
                product.lastInvoice = billNumber;
                if (!product.nameEnglish && item.nameEnglish) {
                    product.nameEnglish = item.nameEnglish;
                }
                await product.save();
                itemsWithIds.push({ ...item, productId: product.productId });
            } else {
                const newProduct = await Product.create({
                    name: item.name,
                    nameEnglish: item.nameEnglish || '',
                    hsnCode: item.hsnCode,
                    price: markupPrice, // Set 30% profit markup!
                    purchaseRate: Number(item.rate),
                    stockAmount: (Number(item.meters) || Number(item.pcs) || 0),
                    lastSupplier: supplierName,
                    lastInvoice: billNumber
                });
                itemsWithIds.push({ ...item, productId: newProduct.productId });
            }
        }
        oldBill.items = itemsWithIds;
        await oldBill.save();

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

        const unpricedProducts = [];
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
