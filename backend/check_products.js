const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = 'mongodb+srv://vatsal:vatsal81@cluster0.mzlndif.mongodb.net/?appName=Cluster0';

async function checkProducts() {
    await mongoose.connect(MONGO_URI);
    const products = await Product.find({}).limit(5);
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
}

checkProducts();
