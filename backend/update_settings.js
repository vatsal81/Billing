const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Settings = require('./models/Settings');

dotenv.config({ path: path.join(__dirname, '.env') });

const updateSettingsToEnglish = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.findOne();
        if (settings) {
            settings.shopName = 'SHREE HARI DRESSES & CUTPIS';
            settings.shopSubTitle = 'Wholesale & Retail';
            settings.shopAddress = 'Madhav Park 1, Next to Shree Hari Complex,\nBehind Alap Royal Palm, Bapasitaram Chowk, Mavdi, Rajkot - 390 004.';
            settings.stampName = 'SHREE HARI DRESSES & CUTPIS';
            settings.terms1 = '1. Subject to Rajkot Jurisdiction.';
            settings.terms2 = '2. E. & O.E.';
            
            await settings.save();
            console.log('Settings updated to English successfully');
        } else {
            console.log('No settings found to update');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error updating settings:', error);
    }
};

updateSettingsToEnglish();
