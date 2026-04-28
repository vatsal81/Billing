const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/smart-billing');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const Product = mongoose.model('Product', mongoose.Schema({
    name: String,
    price: Number
}));

const seedData = async () => {
    await connectDB();
    await Product.deleteMany({});
    await Product.insertMany([
        { name: "કોટન સીલ્ક", price: 150 },
        { name: "ડ્રેસ મટીરીયલ", price: 400 },
        { name: "પંજાબી ડ્રેસ", price: 550 },
        { name: "કુર્તી", price: 300 },
        { name: "સાડી", price: 850 },
        { name: "દુપટ્ટા", price: 120 }
    ]);
    console.log("Gujarati sample products seeded!");
    process.exit();
};

seedData();
