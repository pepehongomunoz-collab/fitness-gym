const express = require('express');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get my subscription
router.get('/me', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ user: req.user._id })
            .populate('plan')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        if (!subscription) {
            return res.json({ hasSubscription: false, message: 'No tienes un plan asignado.' });
        }

        res.json({ hasSubscription: true, subscription });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener suscripción.' });
    }
});

// Get all subscriptions (admin)
router.get('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;

        const subscriptions = await Subscription.find(query)
            .populate('plan')
            .populate('user', 'name email')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Subscription.countDocuments(query);

        res.json({
            subscriptions,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener suscripciones.' });
    }
});

// Assign subscription to user (admin)
router.post('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { userId, planId, endDate, status = 'al_dia' } = req.body;

        // Check if plan exists
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }

        // Check if user already has active subscription
        const existingSub = await Subscription.findOne({
            user: userId,
            status: { $ne: 'suspendido' }
        });

        if (existingSub) {
            // Update existing subscription
            existingSub.plan = planId;
            existingSub.status = status;
            existingSub.endDate = endDate;
            existingSub.lastPaymentDate = new Date();
            await existingSub.save();

            const populated = await Subscription.findById(existingSub._id)
                .populate('plan')
                .populate('user', 'name email');

            return res.json(populated);
        }

        // Create new subscription
        const subscription = new Subscription({
            user: userId,
            plan: planId,
            status,
            endDate,
            lastPaymentDate: new Date(),
            nextPaymentDate: endDate
        });

        await subscription.save();

        const populated = await Subscription.findById(subscription._id)
            .populate('plan')
            .populate('user', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ message: 'Error al asignar suscripción.' });
    }
});

// Update subscription status
router.put('/:id/status', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { status } = req.body;

        if (!['al_dia', 'pendiente', 'suspendido'].includes(status)) {
            return res.status(400).json({ message: 'Estado inválido.' });
        }

        const subscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            {
                status,
                lastPaymentDate: status === 'al_dia' ? new Date() : undefined
            },
            { new: true }
        ).populate('plan').populate('user', 'name email');

        if (!subscription) {
            return res.status(404).json({ message: 'Suscripción no encontrada.' });
        }

        res.json(subscription);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar estado.' });
    }
});

// Delete subscription
router.delete('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const subscription = await Subscription.findByIdAndDelete(req.params.id);
        if (!subscription) {
            return res.status(404).json({ message: 'Suscripción no encontrada.' });
        }
        res.json({ message: 'Suscripción eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar suscripción.' });
    }
});

module.exports = router;
