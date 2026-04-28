const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { protect } = require('./middleware/authMiddleware');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/productRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/settings', protect, require('./routes/settingsRoutes'));
app.use('/api/customers', protect, require('./routes/customerRoutes'));
app.use('/api/expenses', protect, require('./routes/expenseRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
