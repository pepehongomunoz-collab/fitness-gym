const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        console.log(`Auth Middleware: Processing request for ${req.path}`);
        console.log('Auth header:', authHeader ? 'Present' : 'Missing');

        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded, userId:', decoded.userId);

        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            console.log('User not found for id:', decoded.userId);
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        console.log('User authenticated:', user.email, 'Role:', user.role);
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.log('Auth error:', error.message);
        res.status(401).json({ message: 'Token inválido.' });
    }
};

// Check role middleware
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'No tienes permisos para realizar esta acción.'
            });
        }
        next();
    };
};

module.exports = { auth, checkRole };
