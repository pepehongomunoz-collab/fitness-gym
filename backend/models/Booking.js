const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String, // Format: "HH:MM"
        required: true
    },
    endTime: {
        type: String, // Format: "HH:MM"
        required: true
    },
    durationMinutes: {
        type: Number,
        required: true,
        min: 30,
        max: 120
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
        default: 'confirmed'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ date: 1, startTime: 1 });

// Static method to get user's total booked minutes for a date
bookingSchema.statics.getUserDailyMinutes = async function (userId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.find({
        user: userId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' }
    });

    return bookings.reduce((total, booking) => total + booking.durationMinutes, 0);
};

module.exports = mongoose.model('Booking', bookingSchema);
