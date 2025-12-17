const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

/* =========================
   CORS – DEBE IR PRIMERO
========================= */

app.use(cors({
    origin: 'https://pepehongomunoz-collab.github.io',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Responder explícitamente a preflight
app.options('*', (req, res) => {
    res.sendStatus(200);
});

/* =========================
   DEBUG (opcional)
========================= */

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    next();
});

/* =========================
   BODY PARSERS
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   DATABASE
========================= */

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

/* =========================
   API ROUTES (ANTES DEL STATIC)
========================= */

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

/* =========================
   STATIC FRONTEND (AL FINAL)
========================= */

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   FRONTEND ROUTES
========================= */

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

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
