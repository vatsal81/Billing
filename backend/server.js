const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorMiddleware = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
require('dotenv').config();

// Environment Validation
const requiredEnv = ['MONGODB_URI', 'PORT'];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    logger.error(`Critical Error: Environment variable ${env} is missing`);
    process.exit(1);
  }
});

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const blogRoutes = require('./routes/blogRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const marketRoutes = require('./routes/marketRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
const allowedOrigins = [
  'https://shreeharii.vercel.app',
  'https://billing-woad-sigma.vercel.app',
  'https://aabha-impex.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization', 'x-requested-with'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" } 
// }));

app.use(express.json({ limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error(`JSON Syntax Error: ${err.message}`);
    return res.status(400).json({ error: "Malformed JSON in request body" });
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
// app.use('/api/', limiter);

// MongoDB Connection with Retry Logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aabha_impex';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      autoIndex: true,
      family: 4, // Force IPv4 (fixes many ECONNREFUSED issues)
      retryWrites: true,
    });
    logger.info('✅ Connected to MongoDB Successfully');
  } catch (err) {
    logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    logger.info('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/market', marketRoutes);
app.use('/', sitemapRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('AABHA IMPEX API is running (Production Grade)...');
});

// Error Middleware (Must be after routes)
app.use(errorMiddleware);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on port ${PORT} (All Interfaces)`);
});
