// API Configuration
const API_URL = '/api';

// Get stored token
function getToken() {
    return localStorage.getItem('gym_token');
}

// Set token
function setToken(token) {
    localStorage.setItem('gym_token', token);
}

// Remove token
function removeToken() {
    localStorage.removeItem('gym_token');
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
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

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
    me: () => apiRequest('/auth/me'),
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
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Redirect if already authenticated
function redirectIfAuth() {
    if (isAuthenticated()) {
        window.location.href = '/dashboard';
        return true;
    }
    return false;
}

// Logout
function logout() {
    removeToken();
    window.location.href = '/login';
}
