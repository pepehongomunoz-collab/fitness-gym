const express = require('express');
const NutritionPlan = require('../models/NutritionPlan');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get my nutrition plan
router.get('/me', auth, async (req, res) => {
    try {
        const plan = await NutritionPlan.findOne({ user: req.user._id, isActive: true })
            .populate('nutritionist', 'name email')
            .sort({ createdAt: -1 });

        if (!plan) {
            return res.json({ hasPlan: false, message: 'No tienes un plan nutricional asignado.' });
        }

        res.json({ hasPlan: true, plan });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener plan nutricional.' });
    }
});

// Get all nutrition plans (admin)
router.get('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plans = await NutritionPlan.find()
            .populate('user', 'name email')
            .populate('nutritionist', 'name email')
            .sort({ createdAt: -1 });

        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener planes.' });
    }
});

// Create/assign nutrition plan (admin/nutritionist)
router.post('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const {
            userId,
            name,
            goal,
            dailyCalorieTarget,
            macros,
            weeklyPlan,
            restrictions,
            supplements,
            generalNotes
        } = req.body;

        // Deactivate existing plans
        await NutritionPlan.updateMany(
            { user: userId, isActive: true },
            { isActive: false }
        );

        const plan = new NutritionPlan({
            user: userId,
            nutritionist: req.user._id,
            name,
            goal,
            dailyCalorieTarget,
            macros,
            weeklyPlan,
            restrictions,
            supplements,
            generalNotes
        });

        await plan.save();

        const populated = await NutritionPlan.findById(plan._id)
            .populate('user', 'name email')
            .populate('nutritionist', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Nutrition plan error:', error);
        res.status(500).json({ message: 'Error al crear plan nutricional.' });
    }
});

// Update nutrition plan
router.put('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plan = await NutritionPlan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('user', 'name email')
            .populate('nutritionist', 'name email');

        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }

        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar plan.' });
    }
});

// Delete nutrition plan
router.delete('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plan = await NutritionPlan.findByIdAndDelete(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }
        res.json({ message: 'Plan nutricional eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar plan.' });
    }
});

module.exports = router;
