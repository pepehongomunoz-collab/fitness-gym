// Auth page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    redirectIfAuth();

    // Password toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
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

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ingresando...';

        const response = await authAPI.login({ email, password });

        // Store token and user
        setToken(response.token);
        setUser(response.user);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Ingresar</span><i class="fa-solid fa-arrow-right"></i>';
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';

        const response = await authAPI.register({ name, email, password, phone });

        // Store token and user
        setToken(response.token);
        setUser(response.user);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Crear cuenta</span><i class="fa-solid fa-arrow-right"></i>';
    }
}
