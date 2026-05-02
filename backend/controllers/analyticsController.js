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

        const totalPurchases = await Bill.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$items' },
            { $group: { _id: null, total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } }
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

        const purchasesByDay = await Bill.aggregate([
            { $match: { status: 'active', createdAt: { $gte: sinceDate } } },
            { $unwind: '$items' },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }},
            { $sort: { _id: 1 } }
        ]);

        const totalSalesVal = totalSales[0]?.total || 0;
        const totalCOGS = totalPurchases[0]?.total || 0;
        const totalExpensesVal = totalExpenses[0]?.total || 0;
        // Gross Profit = Sales - COGS - Expenses
        const profit = totalSalesVal - totalCOGS - totalExpensesVal;

        res.json({
            totalSales: totalSalesVal,
            totalCOGS,
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

