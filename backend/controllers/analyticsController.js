const Bill = require('../models/Bill');
const PurchaseBill = require('../models/PurchaseBill');
const Product = require('../models/Product');
const Expense = require('../models/Expense');

// @desc    Get dashboard statistics
// @route   GET /api/analytics/stats
const getStats = async (req, res) => {
    try {
        // Support ?period=7d|30d|90d|1y  (default 30d)
        const period = req.query.period || '30d';
        const periodMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        const days = periodMap[period] || 30;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const totalSales = await Bill.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, total: { $sum: '$actualTotal' } } }
        ]);

        const totalPurchases = await PurchaseBill.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const totalExpenses = await Expense.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalBills = await Bill.countDocuments({ status: 'active' });
        const totalProducts = await Product.countDocuments();
        const lowStockProducts = await Product.countDocuments({
            $expr: { $lte: ['$stockAmount', '$lowStockThreshold'] }
        });

        const salesByDay = await Bill.aggregate([
            { $match: { status: 'active', createdAt: { $gte: sinceDate } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total: { $sum: "$actualTotal" }
            }},
            { $sort: { _id: 1 } }
        ]);

        const purchasesByDay = await PurchaseBill.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: sinceDate } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total: { $sum: "$totalAmount" }
            }},
            { $sort: { _id: 1 } }
        ]);

        const totalSalesVal = totalSales[0]?.total || 0;
        const totalPurchasesVal = totalPurchases[0]?.total || 0;
        const totalExpensesVal = totalExpenses[0]?.total || 0;

        // Real Cost of Goods Sold (COGS) based on actual items sold
        const realCOGSQuery = await Bill.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$items' },
            { 
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'prod'
                }
            },
            { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    quantity: { $ifNull: ['$items.quantity', 0] },
                    meter: { $cond: { if: { $gt: ['$items.meter', 0] }, then: '$items.meter', else: 1 } },
                    costPrice: {
                        $cond: {
                            if: { $gt: [{ $ifNull: ['$items.purchaseRate', 0] }, 0] },
                            then: '$items.purchaseRate',
                            else: {
                                $cond: {
                                    if: { $gt: [{ $ifNull: ['$prod.purchaseRate', 0] }, 0] },
                                    then: '$prod.purchaseRate',
                                    else: { $divide: [{ $ifNull: ['$items.price', 0] }, 1.30] }
                                }
                            }
                        }
                    },
                    billType: '$billType'
                }
            },
            {
                $project: {
                    itemCOGS: {
                        $multiply: [
                            { $cond: { if: { $eq: ['$billType', 'return'] }, then: -1, else: 1 } },
                            '$quantity',
                            '$meter',
                            '$costPrice'
                        ]
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$itemCOGS' } } }
        ]);
        const realCOGSVal = realCOGSQuery[0]?.total || 0;

        // Current Stock Value derived directly from recorded Purchases and Sales COGS
        const currentStockValue = Math.max(0, totalPurchasesVal - realCOGSVal);

        // Gross Profit = Sales - Real COGS - Expenses
        const profit = totalSalesVal - realCOGSVal - totalExpensesVal;

        res.json({
            totalSales: totalSalesVal,
            totalPurchases: totalPurchasesVal,
            currentStockValue,
            totalExpenses: totalExpensesVal,
            totalProducts,
            totalBills,
            lowStockProducts,
            salesByDay,
            purchasesByDay,
            profit,
            period
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStats };

