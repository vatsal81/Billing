const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-billing', {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('------------------------------------------------------------');
        console.error('DATABASE CONNECTION ERROR');
        console.error(`Message: ${error.message}`);
        if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
            console.error('\nHINT: This usually means your IP address is not whitelisted in MongoDB Atlas.');
            console.error('Please go to MongoDB Atlas -> Network Access and add "0.0.0.0/0" to allow all IPs.');
        }
        console.error('------------------------------------------------------------');
        process.exit(1);
    }
};

module.exports = connectDB;
