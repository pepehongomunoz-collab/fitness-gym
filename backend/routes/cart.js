const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

// All cart routes require authentication
router.use(auth);

// Get user's cart
router.get('/', async (req, res) => {
    try {
        const cart = await Cart.getOrCreateCart(req.user._id);
        await cart.populate('items.product');

        res.json({
            success: true,
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ message: 'Error al obtener el carrito' });
    }
});

// Add item to cart
router.post('/add', async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Validate product exists and is active
        const product = await Product.findOne({ _id: productId, active: true });
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Stock insuficiente' });
        }

        let cart = await Cart.getOrCreateCart(req.user._id);

        // Check if product already in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                price: product.price
            });
        }

        await cart.save();
        await cart.populate('items.product');

        res.json({
            success: true,
            message: 'Producto agregado al carrito',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Error al agregar al carrito' });
    }
});

// Update item quantity
router.put('/update/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ message: 'La cantidad debe ser al menos 1' });
        }

        // Check stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Stock insuficiente' });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Producto no está en el carrito' });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        await cart.populate('items.product');

        res.json({
            success: true,
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ message: 'Error al actualizar el carrito' });
    }
});

// Remove item from cart
router.delete('/remove/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        await cart.save();
        await cart.populate('items.product');

        res.json({
            success: true,
            message: 'Producto eliminado del carrito',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ message: 'Error al eliminar del carrito' });
    }
});

// Clear cart
router.delete('/clear', async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.json({
            success: true,
            message: 'Carrito vaciado',
            cart: { items: [], total: 0, itemCount: 0 }
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error al vaciar el carrito' });
    }
});

module.exports = router;
