const express = require('express');
const Routine = require('../models/Routine');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get my routine
router.get('/me', auth, async (req, res) => {
    try {
        let routine = await Routine.findOne({ user: req.user._id, isActive: true })
            .populate('trainer', 'name email')
            .sort({ createdAt: -1 });

        // Auto-generate routine if none exists
        if (!routine) {
            const user = req.user;

            // Check if user has objectives to generate a plan
            if (user.objectives && user.objectives.length > 0) {
                const generatedRoutine = generateRoutineFromObjectives(user.objectives, user._id);
                routine = new Routine(generatedRoutine);
                await routine.save();
            } else {
                return res.json({ hasRoutine: false, message: 'No tienes una rutina asignada.' });
            }
        }

        res.json({ hasRoutine: true, routine });
    } catch (error) {
        console.error('Error getting routine:', error);
        res.status(500).json({ message: 'Error al obtener rutina.' });
    }
});

// Helper: Generate routine based on objectives
function generateRoutineFromObjectives(objectives, userId) {
    const isWeightLoss = objectives.some(o => o.includes('grasa'));
    const isMuscleGain = objectives.some(o => o.includes('masa muscular'));
    const isStrength = objectives.some(o => o.includes('fuerza'));

    let template;

    if (isWeightLoss) {
        template = {
            name: 'Plan de Pérdida de Grasa',
            goal: 'perdida_grasa',
            generalNotes: 'Enfócate en mantener el ritmo cardiaco elevado. Descansos cortos (30-45s).',
            days: [
                {
                    day: 'lunes',
                    muscleGroup: 'Full Body - Circuito A',
                    exercises: [
                        { name: 'Sentadillas con peso corporal', sets: 4, reps: '15-20' },
                        { name: 'Push-ups (Flexiones)', sets: 4, reps: '12-15' },
                        { name: 'Remo con mancuernas', sets: 4, reps: '15' },
                        { name: 'Plancha abdominal', sets: 4, reps: '30-45 seg' }
                    ]
                },
                {
                    day: 'miercoles',
                    muscleGroup: 'Full Body - Circuito B',
                    exercises: [
                        { name: 'Zancadas (Lunges)', sets: 4, reps: '12 c/pierna' },
                        { name: 'Press militar con mancuernas', sets: 4, reps: '15' },
                        { name: 'Peso muerto rumano', sets: 4, reps: '15' },
                        { name: 'Mountain Climbers', sets: 4, reps: '45 seg' }
                    ]
                },
                {
                    day: 'viernes',
                    muscleGroup: 'Cardio & Core',
                    exercises: [
                        { name: 'Burpees', sets: 4, reps: '10-12' },
                        { name: 'Saltos de cajón', sets: 4, reps: '12' },
                        { name: 'Crunches abdominales', sets: 4, reps: '20' },
                        { name: 'Elevación de piernas', sets: 4, reps: '15' }
                    ]
                }
            ]
        };
    } else if (isMuscleGain) {
        template = {
            name: 'Plan de Hipertrofia',
            goal: 'hipertrofia',
            generalNotes: 'Controla la fase excéntrica. Descansos de 60-90s. Lleva las series cerca del fallo.',
            days: [
                {
                    day: 'lunes',
                    muscleGroup: 'Pecho y Tríceps',
                    exercises: [
                        { name: 'Press Banca Plano', sets: 4, reps: '8-10' },
                        { name: 'Press Inclinado Mancuernas', sets: 3, reps: '10-12' },
                        { name: 'Aperturas', sets: 3, reps: '12-15' },
                        { name: 'Extensiones de Tríceps Polea', sets: 4, reps: '12-15' }
                    ]
                },
                {
                    day: 'martes',
                    muscleGroup: 'Espalda y Bíceps',
                    exercises: [
                        { name: 'Jalón al pecho', sets: 4, reps: '10-12' },
                        { name: 'Remo con barra', sets: 3, reps: '8-10' },
                        { name: 'Pull-over Polea', sets: 3, reps: '12-15' },
                        { name: 'Curl con Barra', sets: 4, reps: '12' }
                    ]
                },
                {
                    day: 'jueves',
                    muscleGroup: 'Piernas',
                    exercises: [
                        { name: 'Sentadillas', sets: 4, reps: '8-10' },
                        { name: 'Prensa 45°', sets: 3, reps: '12' },
                        { name: 'Extensiones de Cuádriceps', sets: 3, reps: '15' },
                        { name: 'Curl Femoral Tumbado', sets: 3, reps: '12-15' }
                    ]
                },
                {
                    day: 'viernes',
                    muscleGroup: 'Hombros',
                    exercises: [
                        { name: 'Press Militar', sets: 4, reps: '8-10' },
                        { name: 'Elevaciones Laterales', sets: 4, reps: '12-15' },
                        { name: 'Pájaros (Hombro posterior)', sets: 3, reps: '15' }
                    ]
                }
            ]
        };
    } else if (isStrength) {
        template = {
            name: 'Plan de Fuerza Base',
            goal: 'fuerza',
            generalNotes: 'Prioriza la técnica. Descansos largos (2-3 min). Aumenta peso progresivamente.',
            days: [
                {
                    day: 'lunes',
                    muscleGroup: 'Tren Inferior (Sentadilla)',
                    exercises: [
                        { name: 'Sentadilla Trasera', sets: 5, reps: '5' },
                        { name: 'Peso Muerto Rumano', sets: 3, reps: '8' },
                        { name: 'Prensa', sets: 3, reps: '8-10' }
                    ]
                },
                {
                    day: 'miercoles',
                    muscleGroup: 'Empuje (Press Banca)',
                    exercises: [
                        { name: 'Press Banca', sets: 5, reps: '5' },
                        { name: 'Press Militar', sets: 3, reps: '6-8' },
                        { name: 'Dips (Fondos)', sets: 3, reps: '8-10' }
                    ]
                },
                {
                    day: 'viernes',
                    muscleGroup: 'Tracción (Peso Muerto)',
                    exercises: [
                        { name: 'Peso Muerto', sets: 3, reps: '5' },
                        { name: 'Dominadas', sets: 3, reps: 'Al fallo' },
                        { name: 'Remo Pendlay', sets: 3, reps: '6-8' }
                    ]
                }
            ]
        };
    } else {
        // Default Full Body
        template = {
            name: 'Plan General (Full Body)',
            goal: 'mantenimiento',
            generalNotes: 'Mantenimiento general. Entrenamiento de cuerpo completo.',
            days: [
                {
                    day: 'lunes',
                    muscleGroup: 'Full Body A',
                    exercises: [
                        { name: 'Sentadilla Copa', sets: 3, reps: '12' },
                        { name: 'Push-ups', sets: 3, reps: '12' },
                        { name: 'Remo anillas/TRX', sets: 3, reps: '12' }
                    ]
                },
                {
                    day: 'jueves',
                    muscleGroup: 'Full Body B',
                    exercises: [
                        { name: 'Zancadas', sets: 3, reps: '10 c/pierna' },
                        { name: 'Press Hombros Mancuernas', sets: 3, reps: '12' },
                        { name: 'Jalón pecho', sets: 3, reps: '12' }
                    ]
                }
            ]
        };
    }

    return {
        user: userId,
        days: template.days,
        name: template.name,
        goal: template.goal,
        generalNotes: template.generalNotes
    };
}

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
