const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins to unblock requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));
app.options('*', cors()); // Enable preflight for all routes

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/routines', require('./routes/routines'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));

// Checkout redirect routes
app.use('/checkout', require('./routes/checkout'));

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/membresias', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/membresias.html'));
});

app.get('/market', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/market.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/cart.html'));
});

app.get('/order-success', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/order-success.html'));
});

app.get('/order-failure', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/order-failure.html'));
});

app.get('/order-pending', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/order-pending.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
