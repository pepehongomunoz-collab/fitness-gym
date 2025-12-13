const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sets: {
        type: Number,
        required: true
    },
    reps: {
        type: String, // Can be "12" or "12-15" or "al fallo"
        required: true
    },
    weight: {
        type: String // Optional, e.g., "20kg" or "bodyweight"
    },
    notes: {
        type: String
    }
});

const dayRoutineSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        required: true
    },
    muscleGroup: {
        type: String, // e.g., "Pecho y Tríceps", "Espalda y Bíceps"
        required: true
    },
    exercises: [exerciseSchema]
});

const routineSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    name: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        enum: ['hipertrofia', 'fuerza', 'resistencia', 'perdida_grasa', 'mantenimiento'],
        required: true
    },
    days: [dayRoutineSchema],
    generalNotes: {
        type: String
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Routine', routineSchema);
