const Customer = require('../models/Customer');

const getCustomers = async (req, res) => {
    try {
        const keyword = (req.query.keyword || req.query.name) ? {
            $or: [
                { name: { $regex: req.query.keyword || req.query.name, $options: 'i' } },
                { nameGujarati: { $regex: req.query.keyword || req.query.name, $options: 'i' } },
                { phone: { $regex: req.query.keyword || req.query.name, $options: 'i' } }
            ]
        } : {};

        const customers = await Customer.find({ ...keyword }).limit(20);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        if (!customer) return res.status(404).json({ message: "Customer not found" });
        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) return res.status(404).json({ message: "Customer not found" });
        res.json({ message: "Customer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
