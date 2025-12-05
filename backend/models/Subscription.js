const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    status: {
        type: String,
        enum: ['al_dia', 'pendiente', 'suspendido'],
        default: 'pendiente'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    lastPaymentDate: {
        type: Date
    },
    nextPaymentDate: {
        type: Date
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function () {
    return this.status === 'al_dia' && this.endDate > new Date();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
