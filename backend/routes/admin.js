const express = require('express');
const Holiday = require('../models/Holiday');
const GymSettings = require('../models/GymSettings');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const Booking = require('../models/Booking');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// ==================== GYM SETTINGS ====================

// Get gym settings
router.get('/settings', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const settings = await GymSettings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener configuración.' });
    }
});

// Update gym settings
router.put('/settings', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { openTime, closeTime, closedDays, slotDuration, maxCapacityPerSlot } = req.body;

        let settings = await GymSettings.findOne();
        if (!settings) {
            settings = new GymSettings();
        }

        if (openTime) settings.openTime = openTime;
        if (closeTime) settings.closeTime = closeTime;
        if (closedDays !== undefined) settings.closedDays = closedDays;
        if (slotDuration) settings.slotDuration = slotDuration;
        if (maxCapacityPerSlot) settings.maxCapacityPerSlot = maxCapacityPerSlot;
        settings.updatedBy = req.user._id;

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar configuración.' });
    }
});

// ==================== HOLIDAYS ====================

// Get all holidays
router.get('/holidays', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const query = {};

        if (year) {
            const startDate = new Date(year, month ? month - 1 : 0, 1);
            const endDate = new Date(year, month ? month : 12, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const holidays = await Holiday.find(query).sort({ date: 1 });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener feriados.' });
    }
});

// Add holiday
router.post('/holidays', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { date, name, description } = req.body;

        const holiday = new Holiday({
            date: new Date(date),
            name,
            description,
            createdBy: req.user._id
        });

        await holiday.save();
        res.status(201).json(holiday);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe un feriado en esa fecha.' });
        }
        res.status(500).json({ message: 'Error al crear feriado.' });
    }
});

// Delete holiday
router.delete('/holidays/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        res.json({ message: 'Feriado eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar feriado.' });
    }
});

// ==================== USER MANAGEMENT ====================

// Get all users with subscriptions
router.get('/users', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        console.log('Backend: GET /users hit');
        const { search, role, page = 1, limit = 20 } = req.query;

        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        console.log(`Found ${users.length} users`);

        // Get subscriptions for each user
        const usersWithSubs = await Promise.all(users.map(async (user, index) => {
            console.log(`Fetching sub for user ${index}: ${user._id}`);
            const subscription = await Subscription.findOne({ user: user._id })
                .populate('plan')
                .sort({ createdAt: -1 });
            return {
                ...user.toObject(),
                subscription: subscription ? subscription.toObject() : null
            };
        }));

        console.log('Subscriptions fetched');

        const total = await User.countDocuments(query);
        console.log('Sending response');

        res.json({
            users: usersWithSubs,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ message: 'Error al obtener usuarios.' });
    }
});

// Assign plan to user
router.post('/users/:userId/plan', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { planId, status = 'al_dia', months = 1 } = req.body;

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Calculate end date
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        // Create or update subscription
        const subscription = await Subscription.findOneAndUpdate(
            { user: userId },
            {
                user: userId,
                plan: planId,
                status,
                startDate: new Date(),
                endDate,
                lastPaymentDate: new Date(),
                nextPaymentDate: endDate
            },
            { upsert: true, new: true }
        );

        const populated = await Subscription.findById(subscription._id)
            .populate('plan')
            .populate('user', 'name email');

        res.json(populated);
    } catch (error) {
        console.error('Assign plan error:', error);
        res.status(500).json({ message: 'Error al asignar plan.' });
    }
});

// ==================== BOOKING MANAGEMENT ====================

// Get all bookings (admin view)
router.get('/bookings', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { date, userId, status } = req.query;
        const query = {};

        if (date) {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            query.date = { $gte: dayStart, $lte: dayEnd };
        }

        if (userId) query.user = userId;
        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .populate('user', 'name email')
            .sort({ date: 1, startTime: 1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas.' });
    }
});

// Create booking for a user (admin)
router.post('/bookings', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { userId, date, startTime, endTime } = req.body;

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Calculate duration
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

        // Validate duration
        if (durationMinutes < 30) {
            return res.status(400).json({ message: 'La reserva debe ser de al menos 30 minutos.' });
        }
        if (durationMinutes > 120) {
            return res.status(400).json({ message: 'La reserva no puede exceder 2 horas (120 minutos).' });
        }

        const booking = new Booking({
            user: userId,
            date: new Date(date),
            startTime,
            endTime,
            durationMinutes
        });

        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('user', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Admin booking error:', error);
        res.status(500).json({ message: 'Error al crear reserva.' });
    }
});

// Cancel booking (admin)
router.delete('/bookings/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: 'Reserva no encontrada.' });
        }

        res.json({ message: 'Reserva cancelada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cancelar reserva.' });
    }
});

// ==================== PLANS ====================

// Get all plans
router.get('/plans', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plans = await Plan.find().sort({ price: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener planes.' });
    }
});

// ==================== DASHBOARD STATS ====================

router.get('/stats', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeSubscriptions = await Subscription.countDocuments({ status: 'al_dia' });
        const pendingSubscriptions = await Subscription.countDocuments({ status: 'pendiente' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayBookings = await Booking.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            status: 'confirmed'
        });

        res.json({
            totalUsers,
            activeSubscriptions,
            pendingSubscriptions,
            todayBookings
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener estadísticas.' });
    }
});

module.exports = router;
