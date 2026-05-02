require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas...');

        const username = 'admin';
        const password = 'admin';

        // Check if user exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            console.log('User already exists!');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({
            username,
            password: hashedPassword,
            role: 'admin'
        });

        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin');
        process.exit();
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
};

createUser();
