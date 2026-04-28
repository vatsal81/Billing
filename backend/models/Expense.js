const mongoose = require('mongoose');

const expenseSchema = mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
