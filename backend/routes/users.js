const express = require('express');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/developer only)
router.get('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;

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

        const total = await User.countDocuments(query);

        res.json({
            users,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios.' });
    }
});

// Get single user
router.get('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuario.' });
    }
});

// Update user role (admin/developer only)
router.put('/:id/role', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin', 'developer'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido.' });
        }

        // Only developers can create other developers
        if (role === 'developer' && req.user.role !== 'developer') {
            return res.status(403).json({ message: 'Solo developers pueden asignar rol developer.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar rol.' });
    }
});

// Toggle user active status
router.put('/:id/status', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar estado.' });
    }
});

// Delete user (developer only)
router.delete('/:id', auth, checkRole('developer'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json({ message: 'Usuario eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar usuario.' });
    }
});

module.exports = router;
