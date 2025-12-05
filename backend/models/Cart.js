const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    total: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Calculate total before saving
cartSchema.pre('save', function (next) {
    this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    next();
});

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function (userId) {
    let cart = await this.findOne({ user: userId }).populate('items.product');
    if (!cart) {
        cart = await this.create({ user: userId, items: [] });
    }
    return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
