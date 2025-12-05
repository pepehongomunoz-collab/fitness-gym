const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

// Create order and Mercado Pago preference
router.post('/checkout', async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'El carrito está vacío' });
        }

        // Verify stock for all items
        for (const item of cart.items) {
            if (item.product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Stock insuficiente para ${item.product.name}`
                });
            }
        }

        // Create order
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price
        }));

        const order = new Order({
            user: req.user._id,
            items: orderItems,
            total: cart.total,
            status: 'pending'
        });

        await order.save();

        // Create Mercado Pago preference
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
        });

        const preference = new Preference(client);

        const items = cart.items.map(item => ({
            title: item.product.name,
            unit_price: item.price,
            quantity: item.quantity,
            currency_id: 'ARS'
        }));

        // Determine base URL
        const isLocalhost = req.get('host').includes('localhost');
        const baseUrl = isLocalhost
            ? `http://localhost:${process.env.PORT || 5000}`
            : `https://${req.get('host')}`;

        const preferenceData = {
            items,
            payer: {
                email: req.user.email
            },
            back_urls: {
                success: `${baseUrl}/order-success?orderId=${order._id}`,
                failure: `${baseUrl}/order-failure?orderId=${order._id}`,
                pending: `${baseUrl}/order-pending?orderId=${order._id}`
            },
            external_reference: order._id.toString(),
            notification_url: isLocalhost ? undefined : `${baseUrl}/api/orders/webhook`,
            metadata: {
                order_id: order._id.toString(),
                user_id: req.user._id.toString()
            }
        };

        // Only add auto_return for non-localhost
        if (!isLocalhost) {
            preferenceData.auto_return = 'approved';
        }

        const result = await preference.create({ body: preferenceData });

        res.json({
            success: true,
            orderId: order._id,
            preferenceId: result.id,
            initPoint: result.init_point,
            sandboxInitPoint: result.sandbox_init_point
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error al crear la orden' });
    }
});

// Get user's orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('items.product');

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ message: 'Error al obtener órdenes' });
    }
});

// Get single order
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ message: 'Error al obtener la orden' });
    }
});

// Webhook for Mercado Pago notifications (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;

            // Get payment info from Mercado Pago
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
            });

            const response = await fetch(
                `https://api.mercadopago.com/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
                    }
                }
            );

            const payment = await response.json();

            if (payment.status === 'approved') {
                const orderId = payment.external_reference;

                // Update order
                const order = await Order.findById(orderId);
                if (order) {
                    order.status = 'paid';
                    order.paymentId = paymentId;
                    await order.save();

                    // Reduce stock
                    for (const item of order.items) {
                        await Product.findByIdAndUpdate(item.product, {
                            $inc: { stock: -item.quantity }
                        });
                    }

                    // Clear user's cart
                    await Cart.findOneAndUpdate(
                        { user: order.user },
                        { items: [], total: 0 }
                    );
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

module.exports = router;
