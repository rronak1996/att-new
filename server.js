const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for secure cookies and protocol detection behind load balancers
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/attendance', require('./routes/attendance'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle SPA routing - serve index.html for non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     QR Code Attendance System - Server Started             ║
╠════════════════════════════════════════════════════════════╣
║  🌐 Server running at: http://localhost:${PORT}               ║
║  📱 Student scan page: http://localhost:${PORT}/student/mark.html   ║
║  👨‍🏫 Teacher dashboard: http://localhost:${PORT}/teacher/dashboard.html ║
║                                                            ║
║  Default teacher login:                                    ║
║  👤 Username: teacher                                      ║
║  🔑 Password: teacher123                                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
