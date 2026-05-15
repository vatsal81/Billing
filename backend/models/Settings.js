const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
    shopName: { type: String, default: 'SHREE HARI DRESSES & CUTPIS' },
    shopSubTitle: { type: String, default: 'Wholesale & Retail' },
    shopAddress: { type: String, default: 'Madhav Park 1, Next to Shree Hari Complex,\nBehind Alap Royal Palm, Bapasitaram Chowk, Mavdi, Rajkot - 390 004.' },
    gstin: { type: String, default: '24BRNPM8073Q1ZU' },
    stateInfo: { type: String, default: 'State : Gujarat    Code : 24' },
    terms1: { type: String, default: '1. Subject to Rajkot Jurisdiction.' },
    terms2: { type: String, default: '2. E. & O.E.' },
    stampName: { type: String, default: 'SHREE HARI DRESSES & CUTPIS' },
    logo: { type: String, default: '' },
    signature: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
