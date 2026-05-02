const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { protect } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const path = require('path');

dotenv.config();
connectDB();

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/productRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/settings', protect, require('./routes/settingsRoutes'));
app.use('/api/customers', protect, require('./routes/customerRoutes'));
app.use('/api/expenses', protect, require('./routes/expenseRoutes'));
app.use('/api/purchase', protect, require('./routes/purchaseRoutes'));
app.use('/api/suppliers', protect, require('./routes/supplierRoutes'));
app.use('/api/analytics', protect, require('./routes/analyticsRoutes'));
app.use('/api/ledger', protect, require('./routes/ledgerRoutes'));

// Error Handling
app.use(notFound);
app.use(errorHandler);




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
