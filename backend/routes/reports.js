const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const User = require('../models/User');

// All routes require admin/developer role
router.use(auth, checkRole('admin', 'developer'));

// Get sales summary
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const matchStage = { status: 'paid' };
        if (Object.keys(dateFilter).length > 0) {
            matchStage.createdAt = dateFilter;
        }

        const orders = await Order.find(matchStage).sort({ createdAt: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;

        res.json({
            success: true,
            totalSales,
            totalOrders,
            orders
        });
    } catch (error) {
        console.error('Error getting sales:', error);
        res.status(500).json({ message: 'Error al obtener ventas' });
    }
});

// Get subscriptions summary
router.get('/subscriptions', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const matchStage = {};
        if (Object.keys(dateFilter).length > 0) {
            matchStage.createdAt = dateFilter;
        }

        const subscriptions = await Subscription.find(matchStage)
            .populate('user', 'name email')
            .populate('plan', 'name type price')
            .sort({ createdAt: -1 });

        const activeSubscriptions = subscriptions.filter(s => s.paymentStatus === 'al_dia');
        const pendingSubscriptions = subscriptions.filter(s => s.paymentStatus === 'pendiente');
        const totalRevenue = subscriptions
            .filter(s => s.paymentStatus === 'al_dia')
            .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

        res.json({
            success: true,
            total: subscriptions.length,
            active: activeSubscriptions.length,
            pending: pendingSubscriptions.length,
            totalRevenue,
            subscriptions
        });
    } catch (error) {
        console.error('Error getting subscriptions:', error);
        res.status(500).json({ message: 'Error al obtener suscripciones' });
    }
});

// Get all orders with status
router.get('/orders', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ message: 'Error al obtener órdenes' });
    }
});

// Get stock report
router.get('/stock', async (req, res) => {
    try {
        const products = await Product.find({ active: true }).sort({ stock: 1 });

        const lowStock = products.filter(p => {
            if (p.sizes && p.sizes.length > 0) {
                const totalStock = p.sizes.reduce((sum, s) => sum + s.stock, 0);
                return totalStock < 10;
            }
            return p.stock < 10;
        });

        const outOfStock = products.filter(p => {
            if (p.sizes && p.sizes.length > 0) {
                return p.sizes.every(s => s.stock === 0);
            }
            return p.stock === 0;
        });

        res.json({
            success: true,
            totalProducts: products.length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
            products: products.map(p => ({
                _id: p._id,
                name: p.name,
                category: p.category,
                stock: p.sizes?.length > 0
                    ? p.sizes.reduce((sum, s) => sum + s.stock, 0)
                    : p.stock,
                sizes: p.sizes
            }))
        });
    } catch (error) {
        console.error('Error getting stock:', error);
        res.status(500).json({ message: 'Error al obtener stock' });
    }
});

// Get commercial balance
router.get('/balance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Market sales
        const orderQuery = { status: 'paid' };
        if (Object.keys(dateFilter).length > 0) {
            orderQuery.createdAt = dateFilter;
        }
        const orders = await Order.find(orderQuery);
        const marketRevenue = orders.reduce((sum, o) => sum + o.total, 0);

        // Subscription revenue
        const subQuery = { paymentStatus: 'al_dia' };
        if (Object.keys(dateFilter).length > 0) {
            subQuery.createdAt = dateFilter;
        }
        const subscriptions = await Subscription.find(subQuery).populate('plan');
        const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + (s.plan?.price || 0), 0);

        res.json({
            success: true,
            marketRevenue,
            subscriptionRevenue,
            totalRevenue: marketRevenue + subscriptionRevenue,
            ordersCount: orders.length,
            subscriptionsCount: subscriptions.length
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ message: 'Error al obtener balance' });
    }
});

// Get chart data
router.get('/charts', async (req, res) => {
    try {
        // Last 7 days data
        const days = 7;
        const labels = [];
        const salesData = [];
        const subscriptionData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            labels.push(date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }));

            // Sales for this day
            const dayOrders = await Order.find({
                status: 'paid',
                createdAt: { $gte: date, $lt: nextDate }
            });
            salesData.push(dayOrders.reduce((sum, o) => sum + o.total, 0));

            // Subscriptions for this day
            const daySubs = await Subscription.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });
            subscriptionData.push(daySubs);
        }

        res.json({
            success: true,
            labels,
            sales: {
                label: 'Ventas Market ($)',
                data: salesData
            },
            subscriptions: {
                label: 'Nuevas Suscripciones',
                data: subscriptionData
            }
        });
    } catch (error) {
        console.error('Error getting charts:', error);
        res.status(500).json({ message: 'Error al obtener datos de gráficos' });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Error al actualizar orden' });
    }
});

module.exports = router;
