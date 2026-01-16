const express = require('express');
const cors = require('cors');

const adminRoutes = require('./routes/admin.routes');
const memberRoutes = require('./routes/member.routes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Set FRONTEND_URL in .env or allow all origins
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);

module.exports = app;
