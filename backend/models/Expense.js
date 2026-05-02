const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Transport', 'Purchases', 'Marketing', 'Maintenance', 'Other'];

const expenseSchema = mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'Other' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
