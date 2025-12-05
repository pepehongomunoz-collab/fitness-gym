const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'],
        required: true
    },
    foods: [{
        name: { type: String, required: true },
        portion: { type: String }, // e.g., "100g", "1 taza"
        calories: { type: Number },
        protein: { type: Number },
        carbs: { type: Number },
        fat: { type: Number }
    }],
    notes: {
        type: String
    }
});

const dailyPlanSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        required: true
    },
    meals: [mealSchema],
    totalCalories: {
        type: Number
    },
    waterIntake: {
        type: Number, // in liters
        default: 2.5
    }
});

const nutritionPlanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nutritionist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        enum: ['perdida_peso', 'ganancia_muscular', 'mantenimiento', 'definicion'],
        required: true
    },
    dailyCalorieTarget: {
        type: Number
    },
    macros: {
        protein: { type: Number }, // percentage
        carbs: { type: Number },
        fat: { type: Number }
    },
    weeklyPlan: [dailyPlanSchema],
    restrictions: [{
        type: String // e.g., "sin gluten", "vegetariano"
    }],
    supplements: [{
        name: { type: String },
        dosage: { type: String },
        timing: { type: String }
    }],
    generalNotes: {
        type: String
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('NutritionPlan', nutritionPlanSchema);
