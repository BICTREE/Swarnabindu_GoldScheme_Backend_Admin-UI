require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/client/authRoutes');
const userRoutes = require('./routes/client/userRoutes');
const schemeRoutes = require('./routes/client/schemeRoutes');
const paymentRoutes = require('./routes/client/paymentRoutes');
const goldRoutes = require('./routes/client/goldRoutes');
const notificationRoutes = require('./routes/client/notificationRoutes');
const complianceRoutes = require('./routes/client/complianceRoutes');

// Admin routes
const adminAuthRoutes = require('./routes/admin/adminAuthRoutes');
const adminUserRoutes = require('./routes/admin/adminUserRoutes');
const adminSchemeRoutes = require('./routes/admin/adminSchemeRoutes');
const adminPaymentRoutes = require('./routes/admin/adminPaymentRoutes');
const adminGoldRoutes = require('./routes/admin/adminGoldRoutes');
const adminNotificationRoutes = require('./routes/admin/adminNotificationRoutes');
const adminDashboardRoutes = require('./routes/admin/adminDashboardRoutes');
const adminComplianceRoutes = require('./routes/admin/adminComplianceRoutes');

// Compliance middlewares & schedulers
const { sensitiveFieldsMasker } = require('./middleware/maskingMiddleware');
const { startRetentionScheduler } = require('./utils/retentionCron');

// Initialize app
const app = express();

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sensitiveFieldsMasker); // Compliance output masking filter

// Serve file uploads statically
const serveUploadsDir = process.env.VERCEL === '1'
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(serveUploadsDir));

// Root & Version 1 Health Check routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Swarna Bindu Gold Scheme REST API',
    data: {
      version: '1.0.0',
      nodeEnv: process.env.NODE_ENV
    }
  });
});

app.get(['/api/v1', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Swarna Bindu Gold Scheme API v1 server is online and operational',
    data: {
      version: '1.0.0',
      apiVersion: 'v1',
      environment: process.env.NODE_ENV || 'development',
      mockMode: process.env.MOCK_MODE === 'true',
      timestamp: new Date().toISOString()
    }
  });
});

// API Routes mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/schemes', schemeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/gold-rate', goldRoutes); // handles /today
app.use('/api/v1/gold', goldRoutes); // handles /redeem
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/compliance', complianceRoutes);

// Admin API Routes mounting
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/admin/schemes', adminSchemeRoutes);
app.use('/api/v1/admin/payments', adminPaymentRoutes);
app.use('/api/v1/admin/gold-rate', adminGoldRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);
app.use('/api/v1/admin/compliance', adminComplianceRoutes);
app.use('/api/v1/admin', adminDashboardRoutes);  // handles /dashboard/stats and /audit-logs
app.use('/api/v1/admin', adminUserRoutes);       // handles /kyc/pending, /kyc/:id/approve, etc.

// Fallback for 404 Route Not Found
app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  error.errorCode = 'ROUTE_NOT_FOUND';
  next(error);
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`Verify today's gold rate at: http://localhost:${PORT}/api/v1/gold-rate/today`);
    
    // Start data retention policy daily sweep scheduler
    startRetentionScheduler();
  });
}

module.exports = app;
