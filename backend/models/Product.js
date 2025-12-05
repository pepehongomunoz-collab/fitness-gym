const mongoose = require('mongoose');

const sizeStockSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['indumentaria', 'zapatillas', 'complementos', 'suplementos', 'vitaminas', 'bolsos']
    },
    image: {
        type: String,
        default: 'https://via.placeholder.com/300x300?text=Producto'
    },
    // For products without sizes (supplements, vitamins, etc.)
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    // For products with sizes (clothing, shoes)
    sizes: [sizeStockSchema],
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual to calculate total stock from sizes if they exist
productSchema.virtual('totalStock').get(function () {
    if (this.sizes && this.sizes.length > 0) {
        return this.sizes.reduce((total, s) => total + s.stock, 0);
    }
    return this.stock;
});

// Index for search and filtering
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);

