const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { protect } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const path = require('path');
const keepAlive = require('./utils/keepAlive');


dotenv.config();
connectDB();

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "connect-src": ["'self'", "https://www.google.com"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:", "https://*"],
        },
    },
}));
app.use(cors({
    origin: [
        'https://billing-pi-seven.vercel.app',
        'https://billing-system-qa1a.onrender.com/',

        'http://localhost:5173', // For local development
        'http://localhost:5000'
    ],
    credentials: true
}));

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
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/customers', protect, require('./routes/customerRoutes'));
app.use('/api/expenses', protect, require('./routes/expenseRoutes'));
app.use('/api/purchase', protect, require('./routes/purchaseRoutes'));
app.use('/api/suppliers', protect, require('./routes/supplierRoutes'));
app.use('/api/analytics', protect, require('./routes/analyticsRoutes'));
app.use('/api/ledger', protect, require('./routes/ledgerRoutes'));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));

    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(frontendDistPath, 'index.html'));
    });
} else {
    // Base Route for dev
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

// Health check route for pinger
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});


// Error Handling
app.use(notFound);
app.use(errorHandler);




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start the pinger to keep the server awake (for free hosting like Render)
    if (process.env.NODE_ENV === 'production') {
        const APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://billing-system-qa1a.onrender.com';
        keepAlive(`${APP_URL}/ping`);
    }
});



