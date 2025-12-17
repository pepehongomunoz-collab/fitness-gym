// ==============================
// Auth page functionality
// ==============================

document.addEventListener('DOMContentLoaded', () => {

    // Redirect if already logged in
    if (typeof redirectIfAuth === 'function') {
        redirectIfAuth();
    }

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');

            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                icon?.classList.remove('fa-eye');
                icon?.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon?.classList.remove('fa-eye-slash');
                icon?.classList.add('fa-eye');
            }
        });
    });

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// ==============================
// Handle login
// ==============================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
        showError(errorDiv, 'Email y contraseña son obligatorios');
        return;
    }

    try {
        setLoading(submitBtn, true, 'Ingresando...');

        const response = await authAPI.login({ email, password });

        // Store token and user
        setToken(response.token);
        setUser(response.user);

        // Redirect
        window.location.href = 'dashboard.html';

    } catch (error) {
        showError(errorDiv, error.message || 'Error al iniciar sesión');
        setLoading(submitBtn, false, 'Ingresar');
    }
}

// ==============================
// Handle register
// ==============================

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('name')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const phone = document.getElementById('phone')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name || !email || !password || !confirmPassword) {
        showError(errorDiv, 'Todos los campos son obligatorios');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Las contraseñas no coinciden');
        return;
    }

    try {
        setLoading(submitBtn, true, 'Creando cuenta...');

        const response = await authAPI.register({
            name,
            email,
            password,
            phone
        });

        // Store token and user
        setToken(response.token);
        setUser(response.user);

        // Redirect
        window.location.href = 'dashboard.html';

    } catch (error) {
        showError(errorDiv, error.message || 'Error al registrarse');
        setLoading(submitBtn, false, 'Crear cuenta');
    }
}

// ==============================
// Helpers
// ==============================

function showError(container, message) {
    if (!container) return;
    container.textContent = message;
    container.style.display = 'block';
}

function setLoading(button, loading, text) {
    if (!button) return;

    button.disabled = loading;

    if (loading) {
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    } else {
        button.innerHTML = `<span>${text}</span><i class="fa-solid fa-arrow-right"></i>`;
    }
}
