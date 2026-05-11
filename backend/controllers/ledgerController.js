const LedgerEntry = require('../models/LedgerEntry');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');

// @desc    Add a payment/transaction entry
// @route   POST /api/ledger
const addEntry = async (req, res) => {
    try {
        const { partyType, partyId, partyName, type, amount, description } = req.body;

        const entry = await LedgerEntry.create({
            partyType,
            partyId,
            partyName,
            type,
            amount,
            description
        });

        // Update party balance
        if (partyType === 'customer') {
            const customer = await Customer.findById(partyId);
            if (customer) {
                // type 'debit' = Customer owes us more (Credit Sale)
                // type 'credit' = Customer paid us (Payment Received)
                customer.balance += (type === 'debit' ? amount : -amount);
                await customer.save();
                entry.balanceAfter = customer.balance;
                await entry.save();
            }
        } else if (partyType === 'supplier') {
            const supplier = await Supplier.findById(partyId);
            if (supplier) {
                // type 'credit' means we owe more to supplier, 'debit' means we paid supplier
                supplier.balance += (type === 'credit' ? amount : -amount);
                await supplier.save();
                entry.balanceAfter = supplier.balance;
                await entry.save();
            }
        }

        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get ledger entries for a party
// @route   GET /api/ledger/:partyId
const getEntries = async (req, res) => {
    try {
        const partyId = req.params.partyId;
        const fs = require('fs');
        fs.appendFileSync('ledger_trace.log', `[${new Date().toISOString()}] REQ ID: ${partyId}\n`);
        
        if (!partyId || partyId === 'null' || partyId === 'undefined') {
            return res.json([]);
        }
        
        const entries = await LedgerEntry.find({ partyId: partyId }).sort({ date: -1 });
        fs.appendFileSync('ledger_trace.log', `[${new Date().toISOString()}] FOUND: ${entries.length}\n`);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addEntry, getEntries };
