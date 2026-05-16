const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Counter = require('../models/Counter');

dotenv.config();

const generateIds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Initialize counter if it doesn't exist
        let counter = await Counter.findOne({ id: 'productId' });
        if (!counter) {
            counter = await Counter.create({ id: 'productId', seq: 1000 });
        }

        const products = await Product.find({ 
            $or: [
                { productId: { $exists: false } },
                { productId: '' },
                { productId: null },
                { productId: { $regex: /^P-/ } } // Find old format IDs
            ]
        });
        
        console.log(`Generating IDs for ${products.length} products...`);

        for (const product of products) {
            counter.seq += 1;
            const newId = `SH-${counter.seq}`;
            product.productId = newId;
            await product.save();
            console.log(`Assigned ${newId} to ${product.nameEnglish || product.name}`);
        }

        await counter.save();
        console.log('ID generation complete');
        process.exit(0);
    } catch (error) {
        console.error('Failed to generate IDs:', error);
        process.exit(1);
    }
};

generateIds();
