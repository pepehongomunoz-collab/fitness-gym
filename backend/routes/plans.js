const express = require('express');
const Plan = require('../models/Plan');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all plans
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener planes.' });
    }
});

// Get single plan
router.get('/:id', async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener plan.' });
    }
});

// Create plan (admin/developer only)
router.post('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plan = new Plan(req.body);
        await plan.save();
        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear plan.' });
    }
});

// Update plan
router.put('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar plan.' });
    }
});

// Seed default plans
router.post('/seed', auth, checkRole('developer'), async (req, res) => {
    try {
        const defaultPlans = [
            {
                name: 'classic',
                displayName: 'Plan Classic',
                price: 30000,
                maxDailyMinutes: 120,
                features: [
                    'Acceso a sala de musculación',
                    'Hasta 2 horas diarias',
                    'Casillero incluido',
                    'Duchas'
                ],
                description: 'Plan ideal para quienes comienzan su camino fitness'
            },
            {
                name: 'premium',
                displayName: 'Plan Premium',
                price: 50000,
                maxDailyMinutes: 1440,
                features: [
                    'Acceso ilimitado',
                    'Clases grupales incluidas',
                    'Personal trainer 1 sesión/semana',
                    'Nutricionista 1 consulta/mes',
                    'Toalla incluida',
                    'Estacionamiento'
                ],
                description: 'La experiencia fitness más completa'
            },
            {
                name: 'online',
                displayName: 'Plan Online',
                price: 15000,
                maxDailyMinutes: 0,
                features: [
                    'Rutinas personalizadas',
                    'Seguimiento online',
                    'App móvil',
                    'Videos de ejercicios'
                ],
                description: 'Entrena desde casa con guía profesional'
            }
        ];

        for (const planData of defaultPlans) {
            await Plan.findOneAndUpdate(
                { name: planData.name },
                planData,
                { upsert: true, new: true }
            );
        }

        const plans = await Plan.find();
        res.json({ message: 'Planes creados/actualizados', plans });
    } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ message: 'Error al crear planes.' });
    }
});

module.exports = router;
