// Memberships page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Update auth icon based on login status
    updateAuthIcon();
});

// Update auth icon
function updateAuthIcon() {
    const authIcon = document.getElementById('authIcon');
    if (isAuthenticated()) {
        const user = getUser();
        authIcon.href = '/dashboard';
        authIcon.title = user?.name || 'Mi Dashboard';
        authIcon.innerHTML = '<i class="fa-solid fa-gauge-high"></i>';
    }
}

// Subscribe to plan
async function subscribeToPlan(planName) {
    // Check if user is logged in
    if (!isAuthenticated()) {
        // Save intended plan and redirect to login
        sessionStorage.setItem('intended_plan', planName);
        window.location.href = '/login';
        return;
    }

    const loadingModal = document.getElementById('loadingModal');
    loadingModal.classList.add('open');

    try {
        const response = await apiRequest('/checkout/create-preference', {
            method: 'POST',
            body: { planName }
        });

        // Redirect to Mercado Pago checkout
        // Use sandbox URL for testing, init_point for production
        const checkoutUrl = response.sandboxInitPoint || response.initPoint;
        window.location.href = checkoutUrl;
    } catch (error) {
        loadingModal.classList.remove('open');
        alert('Error al procesar el pago: ' + error.message);
    }
}

// Check for intended plan after login
function checkIntendedPlan() {
    const intendedPlan = sessionStorage.getItem('intended_plan');
    if (intendedPlan && isAuthenticated()) {
        sessionStorage.removeItem('intended_plan');
        subscribeToPlan(intendedPlan);
    }
}

// Run on page load
if (document.readyState === 'complete') {
    checkIntendedPlan();
} else {
    window.addEventListener('load', checkIntendedPlan);
}
