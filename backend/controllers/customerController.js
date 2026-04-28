const Customer = require('../models/Customer');

const getCustomers = async (req, res) => {
    try {
        const keyword = req.query.keyword ? {
            $or: [
                { name: { $regex: req.query.keyword, $options: 'i' } },
                { nameGujarati: { $regex: req.query.keyword, $options: 'i' } }
            ]
        } : {};

        const customers = await Customer.find({ ...keyword }).limit(20);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCustomers };
