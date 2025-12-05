const express = require('express');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get my bookings
router.get('/me', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = { user: req.user._id };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const bookings = await Booking.find(query).sort({ date: 1, startTime: 1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas.' });
    }
});

// Get all bookings for a date (admin)
router.get('/date/:date', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const bookings = await Booking.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' }
        })
            .populate('user', 'name email')
            .sort({ startTime: 1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas.' });
    }
});

// Create booking
router.post('/', auth, async (req, res) => {
    try {
        const { date, startTime, endTime } = req.body;

        // Get user's subscription with plan
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'al_dia'
        }).populate('plan');

        if (!subscription) {
            return res.status(403).json({
                message: 'Necesitas un plan activo para reservar turnos.'
            });
        }

        // Check if it's an online plan (can't book)
        if (subscription.plan.name === 'online') {
            return res.status(403).json({
                message: 'Tu plan Online no incluye reserva de turnos presenciales.'
            });
        }

        // Calculate duration
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

        if (durationMinutes < 30 || durationMinutes > 120) {
            return res.status(400).json({
                message: 'La reserva debe ser entre 30 minutos y 2 horas.'
            });
        }

        // Check daily limit for classic plan
        if (subscription.plan.name === 'classic') {
            const bookedMinutes = await Booking.getUserDailyMinutes(req.user._id, date);

            if (bookedMinutes + durationMinutes > subscription.plan.maxDailyMinutes) {
                const remaining = subscription.plan.maxDailyMinutes - bookedMinutes;
                return res.status(400).json({
                    message: `Has alcanzado tu límite diario. Te quedan ${remaining} minutos disponibles.`
                });
            }
        }

        // Check for overlapping bookings
        const bookingDate = new Date(date);
        const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

        const overlapping = await Booking.findOne({
            user: req.user._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' },
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({
                message: 'Ya tienes una reserva en ese horario.'
            });
        }

        const booking = new Booking({
            user: req.user._id,
            date: new Date(date),
            startTime,
            endTime,
            durationMinutes
        });

        await booking.save();
        res.status(201).json(booking);
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: 'Error al crear reserva.' });
    }
});

// Cancel booking
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!booking) {
            return res.status(404).json({ message: 'Reserva no encontrada.' });
        }

        // Check if booking is in the past
        const now = new Date();
        const bookingDateTime = new Date(booking.date);
        const [hours, mins] = booking.startTime.split(':');
        bookingDateTime.setHours(parseInt(hours), parseInt(mins));

        if (bookingDateTime < now) {
            return res.status(400).json({
                message: 'No puedes cancelar una reserva pasada.'
            });
        }

        booking.status = 'cancelled';
        await booking.save();

        res.json({ message: 'Reserva cancelada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cancelar reserva.' });
    }
});

// Get available slots for a date
router.get('/available/:date', auth, async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const dayOfWeek = date.getDay();

        // Gym is closed on Sundays
        if (dayOfWeek === 0) {
            return res.json({ slots: [], message: 'El gimnasio está cerrado los domingos.' });
        }

        // Generate all 30-min slots from 6:00 to 22:00
        const allSlots = [];
        for (let hour = 6; hour < 22; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }

        // Get booked slots for the date
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const bookings = await Booking.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' }
        });

        // Mark busy slots (for capacity management - simplified)
        const slotCounts = {};
        const MAX_CAPACITY = 50; // Max people per slot

        bookings.forEach(booking => {
            const start = booking.startTime;
            slotCounts[start] = (slotCounts[start] || 0) + 1;
        });

        const availableSlots = allSlots.map(slot => ({
            time: slot,
            available: (slotCounts[slot] || 0) < MAX_CAPACITY,
            count: slotCounts[slot] || 0
        }));

        res.json({ slots: availableSlots });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener horarios.' });
    }
});

module.exports = router;
