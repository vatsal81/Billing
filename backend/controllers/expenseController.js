const Expense = require('../models/Expense');

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const { description, amount, date } = req.body;
        const expense = await Expense.create({
            description,
            amount,
            date: date || Date.now()
        });
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: "Expense deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
