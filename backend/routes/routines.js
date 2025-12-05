const express = require('express');
const Routine = require('../models/Routine');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get my routine
router.get('/me', auth, async (req, res) => {
    try {
        const routine = await Routine.findOne({ user: req.user._id, isActive: true })
            .populate('trainer', 'name email')
            .sort({ createdAt: -1 });

        if (!routine) {
            return res.json({ hasRoutine: false, message: 'No tienes una rutina asignada.' });
        }

        res.json({ hasRoutine: true, routine });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener rutina.' });
    }
});

// Get all routines (admin/trainer)
router.get('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const routines = await Routine.find()
            .populate('user', 'name email')
            .populate('trainer', 'name email')
            .sort({ createdAt: -1 });

        res.json(routines);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener rutinas.' });
    }
});

// Get user's routine (admin)
router.get('/user/:userId', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const routine = await Routine.findOne({
            user: req.params.userId,
            isActive: true
        })
            .populate('trainer', 'name email');

        res.json(routine);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener rutina.' });
    }
});

// Create/assign routine (admin/trainer)
router.post('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { userId, name, goal, days, generalNotes, endDate } = req.body;

        // Deactivate existing routines
        await Routine.updateMany(
            { user: userId, isActive: true },
            { isActive: false }
        );

        const routine = new Routine({
            user: userId,
            trainer: req.user._id,
            name,
            goal,
            days,
            generalNotes,
            endDate
        });

        await routine.save();

        const populated = await Routine.findById(routine._id)
            .populate('user', 'name email')
            .populate('trainer', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Routine error:', error);
        res.status(500).json({ message: 'Error al crear rutina.' });
    }
});

// Update routine
router.put('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const routine = await Routine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('user', 'name email')
            .populate('trainer', 'name email');

        if (!routine) {
            return res.status(404).json({ message: 'Rutina no encontrada.' });
        }

        res.json(routine);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar rutina.' });
    }
});

// Delete routine
router.delete('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const routine = await Routine.findByIdAndDelete(req.params.id);
        if (!routine) {
            return res.status(404).json({ message: 'Rutina no encontrada.' });
        }
        res.json({ message: 'Rutina eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar rutina.' });
    }
});

module.exports = router;
