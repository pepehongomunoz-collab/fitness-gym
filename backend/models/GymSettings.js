const mongoose = require('mongoose');

const gymSettingsSchema = new mongoose.Schema({
    // Operating hours
    openTime: {
        type: String,
        default: '06:00'
    },
    closeTime: {
        type: String,
        default: '22:00'
    },
    // Days closed (0 = Sunday, 6 = Saturday)
    closedDays: {
        type: [Number],
        default: [0] // Sunday closed by default
    },
    // Slot duration in minutes
    slotDuration: {
        type: Number,
        default: 30
    },
    // Max capacity per slot
    maxCapacityPerSlot: {
        type: Number,
        default: 50
    },
    // Last updated by
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
gymSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('GymSettings', gymSettingsSchema);
