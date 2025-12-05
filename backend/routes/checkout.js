const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize Mercado Pago client
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

const preference = new Preference(client);

// Plan prices (in ARS)
const PLAN_PRICES = {
    classic: 30000,
    premium: 50000,
    online: 15000
};

// Create checkout preference
router.post('/create-preference', auth, async (req, res) => {
    try {
        const { planName } = req.body;

        if (!PLAN_PRICES[planName]) {
            return res.status(400).json({ message: 'Plan inválido' });
        }

        // Find or create plan in database
        let plan = await Plan.findOne({ name: planName });
        if (!plan) {
            // Create plan if it doesn't exist
            const planData = {
                classic: {
                    name: 'classic',
                    displayName: 'Plan Classic',
                    price: 30000,
                    maxDailyMinutes: 120,
                    features: ['Acceso a sala de musculación', 'Hasta 2 horas diarias', 'Casillero incluido', 'Duchas'],
                    description: 'Plan ideal para comenzar'
                },
                premium: {
                    name: 'premium',
                    displayName: 'Plan Premium',
                    price: 50000,
                    maxDailyMinutes: 1440,
                    features: ['Acceso ilimitado', 'Clases grupales', 'Personal trainer 1x/semana', 'Nutricionista 1x/mes'],
                    description: 'La experiencia completa'
                },
                online: {
                    name: 'online',
                    displayName: 'Plan Online',
                    price: 15000,
                    maxDailyMinutes: 0,
                    features: ['Rutinas personalizadas', 'Seguimiento online', 'App móvil', 'Videos HD'],
                    description: 'Entrena desde casa'
                }
            };
            plan = await Plan.create(planData[planName]);
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const isLocalhost = baseUrl.includes('localhost');

        // Create preference - simpler version for sandbox/localhost
        const preferenceData = {
            items: [
                {
                    id: plan._id.toString(),
                    title: plan.displayName,
                    description: plan.description || 'Suscripción mensual',
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: Number(plan.price)
                }
            ],
            payer: {
                email: req.user.email
            },
            external_reference: JSON.stringify({
                userId: req.user._id.toString(),
                planId: plan._id.toString(),
                planName: planName
            }),
            statement_descriptor: 'FITNESS GYM'
        };

        // Only add back_urls and auto_return for non-localhost environments
        if (!isLocalhost) {
            preferenceData.back_urls = {
                success: `${baseUrl}/checkout/success`,
                failure: `${baseUrl}/checkout/failure`,
                pending: `${baseUrl}/checkout/pending`
            };
            preferenceData.auto_return = 'approved';
            preferenceData.notification_url = `${baseUrl}/api/checkout/webhook`;
        }

        console.log('Creating preference with data:', JSON.stringify(preferenceData, null, 2));

        const result = await preference.create({ body: preferenceData });

        console.log('Preference created:', result.id);

        res.json({
            preferenceId: result.id,
            initPoint: result.init_point,
            sandboxInitPoint: result.sandbox_init_point
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ message: 'Error al crear el checkout', error: error.message });
    }
});

// Webhook for payment notifications
router.post('/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });

            if (paymentInfo.status === 'approved') {
                const externalReference = JSON.parse(paymentInfo.external_reference);

                // Calculate subscription end date (1 month from now)
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);

                // Create or update subscription
                await Subscription.findOneAndUpdate(
                    { user: externalReference.userId },
                    {
                        user: externalReference.userId,
                        plan: externalReference.planId,
                        status: 'al_dia',
                        startDate: new Date(),
                        endDate: endDate,
                        lastPaymentDate: new Date(),
                        nextPaymentDate: endDate
                    },
                    { upsert: true, new: true }
                );

                console.log('✅ Subscription activated for user:', externalReference.userId);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// Success page route
router.get('/success', (req, res) => {
    res.sendFile('checkout-success.html', { root: './frontend/pages' });
});

// Failure page route
router.get('/failure', (req, res) => {
    res.sendFile('checkout-failure.html', { root: './frontend/pages' });
});

// Pending page route
router.get('/pending', (req, res) => {
    res.sendFile('checkout-pending.html', { root: './frontend/pages' });
});

module.exports = router;
