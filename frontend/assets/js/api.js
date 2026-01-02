// API Configuration
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://fitness-gym-h1qk.onrender.com/api';

// Get stored token
function getToken() {
    return localStorage.getItem('token'); // Changed from 'gym_token' to 'token' based on dashboard.js usage
}

// Set token
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token
function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('gym_user');
}

// Get stored user
function getUser() {
    const user = localStorage.getItem('gym_user');
    return user ? JSON.parse(user) : null;
}

// Set user
function setUser(user) {
    localStorage.setItem('gym_user', JSON.stringify(user));
}

// API Request helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const config = {
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    if (!(options.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for Render cold start
    config.signal = controller.signal;

    try {
        console.log(`API Request starting: ${config.method || 'GET'} ${API_URL}${endpoint}`);
        const response = await fetch(`${API_URL}${endpoint}`, config);
        clearTimeout(timeoutId);
        console.log(`API Response received: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('API Response body length:', text.length);

        const data = text ? JSON.parse(text) : {};
        console.log('API Body parsed successfully');

        if (!response.ok) {
            throw new Error(data.message || 'Error en la solicitud');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
    getMe: () => apiRequest('/auth/me'),
    updateProfile: (data) => apiRequest('/auth/profile', { method: 'PUT', body: data }),
    changePassword: (data) => apiRequest('/auth/password', { method: 'PUT', body: data })
};

// Plans API
const plansAPI = {
    getAll: () => apiRequest('/plans'),
    getById: (id) => apiRequest(`/plans/${id}`)
};

// Subscriptions API
const subscriptionsAPI = {
    getMine: () => apiRequest('/subscriptions/me'),
    getAll: () => apiRequest('/subscriptions'),
    create: (data) => apiRequest('/subscriptions', { method: 'POST', body: data }),
    updateStatus: (id, status) => apiRequest(`/subscriptions/${id}/status`, { method: 'PUT', body: { status } })
};

// Routines API
const routinesAPI = {
    getMine: () => apiRequest('/routines/me'),
    getAll: () => apiRequest('/routines'),
    create: (data) => apiRequest('/routines', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`/routines/${id}`, { method: 'PUT', body: data })
};

// Bookings API
const bookingsAPI = {
    getMine: (startDate, endDate) => {
        let url = '/bookings/me';
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        return apiRequest(url);
    },
    getByDate: (date) => apiRequest(`/bookings/date/${date}`),
    getAvailable: (date) => apiRequest(`/bookings/available/${date}`),
    create: (data) => apiRequest('/bookings', { method: 'POST', body: data }),
    cancel: (id) => apiRequest(`/bookings/${id}`, { method: 'DELETE' })
};

// Nutrition API
const nutritionAPI = {
    getMine: () => apiRequest('/nutrition/me'),
    getAll: () => apiRequest('/nutrition'),
    create: (data) => apiRequest('/nutrition', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`/nutrition/${id}`, { method: 'PUT', body: data })
};

// Users API (Admin)
const usersAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/users?${query}`);
    },
    getById: (id) => apiRequest(`/users/${id}`),
    updateRole: (id, role) => apiRequest(`/users/${id}/role`, { method: 'PUT', body: { role } }),
    updateStatus: (id, isActive) => apiRequest(`/users/${id}/status`, { method: 'PUT', body: { isActive } })
};

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Redirect if already authenticated
function redirectIfAuth() {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return true;
    }
    return false;
}

// Logout
function logout() {
    removeToken();
    window.location.href = 'login.html';
}
