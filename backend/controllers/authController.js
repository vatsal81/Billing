const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        let user = await User.findOne({ username });
        
        if (user && (await bcrypt.compare(password, user.password))) {
            return res.json({
                _id: user.id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id)
            });
        } 
        
        const totalUsers = await User.countDocuments();
        if (totalUsers === 0 && username === 'admin' && password === 'admin') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);
            user = await User.create({ username: 'admin', password: hashedPassword, role: 'admin' });
            return res.json({
                _id: user.id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id)
            });
        }
        res.status(401).json({ message: 'Invalid credentials' });
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { login };
