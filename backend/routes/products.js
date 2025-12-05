const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, checkRole } = require('../middleware/auth');

// Get all products with filters
router.get('/', async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search, sort } = req.query;

        let query = { active: true };

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Search by name or description
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort options
        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') sortOption = { price: 1 };
        if (sort === 'price_desc') sortOption = { price: -1 };
        if (sort === 'name') sortOption = { name: 1 };

        const products = await Product.find(query).sort(sortOption);

        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error al obtener productos' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener producto' });
    }
});

// Get categories list
router.get('/meta/categories', async (req, res) => {
    const categories = [
        { value: 'indumentaria', label: 'Indumentaria' },
        { value: 'zapatillas', label: 'Zapatillas' },
        { value: 'complementos', label: 'Complementos Dietarios' },
        { value: 'suplementos', label: 'Suplementos' },
        { value: 'vitaminas', label: 'Vitaminas' },
        { value: 'bolsos', label: 'Bolsos' }
    ];
    res.json(categories);
});

// Admin: Create product
router.post('/', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body;

        const product = new Product({
            name,
            description,
            price,
            category,
            image,
            stock: stock || 0
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error al crear producto' });
    }
});

// Admin: Update product
router.put('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const { name, description, price, category, image, stock, active } = req.body;

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { name, description, price, category, image, stock, active },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar producto' });
    }
});

// Admin: Delete product
router.delete('/:id', auth, checkRole('admin', 'developer'), async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
});

// Seed demo products
router.post('/seed', async (req, res) => {
    try {
        const existingCount = await Product.countDocuments();
        if (existingCount > 0) {
            return res.json({ message: 'Ya existen productos en la base de datos', count: existingCount });
        }

        const demoProducts = [
            // Indumentaria
            { name: 'Remera Dry-Fit Pro', description: 'Remera deportiva de alta tecnología con secado rápido', price: 15000, category: 'indumentaria', stock: 50, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
            { name: 'Calza Compresión', description: 'Calza de compresión para máximo rendimiento', price: 22000, category: 'indumentaria', stock: 30, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400' },
            { name: 'Short Training', description: 'Short liviano ideal para entrenamiento', price: 12000, category: 'indumentaria', stock: 40, image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400' },

            // Zapatillas
            { name: 'Zapatillas Running Pro', description: 'Zapatillas profesionales para running con amortiguación', price: 85000, category: 'zapatillas', stock: 20, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
            { name: 'Zapatillas CrossFit', description: 'Zapatillas especiales para CrossFit y entrenamiento funcional', price: 75000, category: 'zapatillas', stock: 15, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400' },

            // Complementos dietarios
            { name: 'Barras Proteicas x12', description: 'Pack de 12 barras proteicas sabor chocolate', price: 18000, category: 'complementos', stock: 100, image: 'https://images.unsplash.com/photo-1622484212850-eb596d769eab?w=400' },
            { name: 'Snacks Energéticos', description: 'Mix de frutos secos y semillas', price: 8000, category: 'complementos', stock: 80, image: 'https://images.unsplash.com/photo-1604162011619-eb0ec6b65a7f?w=400' },

            // Suplementos
            { name: 'Whey Protein 2kg', description: 'Proteína de suero de alta calidad, sabor vainilla', price: 45000, category: 'suplementos', stock: 25, image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400' },
            { name: 'Creatina Monohidratada', description: 'Creatina pura 300g para mayor fuerza y rendimiento', price: 25000, category: 'suplementos', stock: 40, image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400' },
            { name: 'Pre-Workout Energy', description: 'Pre-entreno para máxima energía y concentración', price: 28000, category: 'suplementos', stock: 35, image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400' },

            // Vitaminas
            { name: 'Multivitamínico Completo', description: 'Complejo vitamínico y mineral diario', price: 15000, category: 'vitaminas', stock: 60, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400' },
            { name: 'Vitamina D3 + K2', description: 'Vitamina D3 5000 UI con K2 para huesos fuertes', price: 12000, category: 'vitaminas', stock: 45, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
            { name: 'Omega 3 Fish Oil', description: 'Aceite de pescado omega 3 de alta pureza', price: 18000, category: 'vitaminas', stock: 50, image: 'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=400' },

            // Bolsos
            { name: 'Bolso Gym Pro', description: 'Bolso deportivo grande con compartimentos', price: 35000, category: 'bolsos', stock: 20, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
            { name: 'Mochila Fitness', description: 'Mochila deportiva con porta notebook', price: 42000, category: 'bolsos', stock: 15, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' }
        ];

        await Product.insertMany(demoProducts);
        res.json({ message: 'Productos demo creados', count: demoProducts.length });
    } catch (error) {
        console.error('Error seeding products:', error);
        res.status(500).json({ message: 'Error al crear productos demo' });
    }
});

module.exports = router;
