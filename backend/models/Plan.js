const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ['classic', 'premium', 'online'],
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    maxDailyMinutes: {
        type: Number,
        required: true
        // classic: 120 (2 hours), premium: 1440 (24 hours/unlimited), online: 0
    },
    features: [{
        type: String
    }],
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);
