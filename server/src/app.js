const express = require('express');
const cors = require('cors');
require('dotenv').config();
// Import routes
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'LinguaLift API is running!' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Handle 404
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({ message: 'A record with this data already exists' });
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;