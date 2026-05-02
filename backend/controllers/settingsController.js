const Settings = require('../models/Settings');

const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        let updateData = { ...req.body };

        if (req.files) {
            if (req.files['logo']) updateData.logo = req.files['logo'][0].path;
            if (req.files['signature']) updateData.signature = req.files['signature'][0].path;
        }

        if (!settings) {
            settings = await Settings.create(updateData);
        } else {
            Object.assign(settings, updateData);
            await settings.save();
        }
        res.json(settings);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSettings, updateSettings };
