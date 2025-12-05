// Cart page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    const emptyCart = document.getElementById('emptyCart');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const cartCountEl = document.getElementById('cartCount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');

    // Initialize
    loadCart();
    updateAuthIcon();

    // Load cart items
    async function loadCart() {
        const token = localStorage.getItem('gym_token');

        if (!token) {
            showEmptyCart();
            return;
        }

        try {
            const response = await fetch('/api/cart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.cart.items.length > 0) {
                renderCartItems(data.cart.items);
                updateSummary(data.cart.total);
                cartCountEl.textContent = data.cart.itemCount;
            } else {
                showEmptyCart();
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            cartItems.innerHTML = `
                <div class="error-message">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    <p>Error al cargar el carrito</p>
                </div>
            `;
        }
    }

    // Render cart items
    function renderCartItems(items) {
        cartItems.innerHTML = items.map(item => `
            <div class="cart-item" data-id="${item.product._id}">
                <div class="item-image">
                    <img src="${item.product.image}" alt="${item.product.name}">
                </div>
                <div class="item-details">
                    <h3>${item.product.name}</h3>
                    <p class="item-category">${getCategoryLabel(item.product.category)}</p>
                    <p class="item-price">$${item.price.toLocaleString('es-AR')}</p>
                </div>
                <div class="item-quantity">
                    <button class="qty-btn" onclick="updateQuantity('${item.product._id}', ${item.quantity - 1})">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.product._id}', ${item.quantity + 1})">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="item-subtotal">
                    <span>$${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                </div>
                <button class="btn-remove" onclick="removeItem('${item.product._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');

        cartSummary.style.display = 'block';
        emptyCart.style.display = 'none';
    }

    // Get category label
    function getCategoryLabel(category) {
        const labels = {
            'indumentaria': 'Indumentaria',
            'zapatillas': 'Zapatillas',
            'complementos': 'Complementos',
            'suplementos': 'Suplementos',
            'vitaminas': 'Vitaminas',
            'bolsos': 'Bolsos'
        };
        return labels[category] || category;
    }

    // Show empty cart state
    function showEmptyCart() {
        cartItems.innerHTML = '';
        cartSummary.style.display = 'none';
        emptyCart.style.display = 'flex';
        cartCountEl.textContent = '0';
    }

    // Update summary
    function updateSummary(total) {
        subtotalEl.textContent = `$${total.toLocaleString('es-AR')}`;
        totalEl.textContent = `$${total.toLocaleString('es-AR')}`;
    }

    // Update auth icon
    function updateAuthIcon() {
        const token = localStorage.getItem('gym_token');
        const authIcon = document.getElementById('authIcon');

        if (token) {
            authIcon.href = '/dashboard';
            authIcon.title = 'Mi Dashboard';
        }
    }

    // Update quantity
    window.updateQuantity = async function (productId, newQuantity) {
        if (newQuantity < 1) {
            removeItem(productId);
            return;
        }

        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch(`/api/cart/update/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quantity: newQuantity })
            });

            const data = await response.json();

            if (data.success) {
                renderCartItems(data.cart.items);
                updateSummary(data.cart.total);
                cartCountEl.textContent = data.cart.itemCount;
            } else {
                alert(data.message || 'Error al actualizar cantidad');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    // Remove item
    window.removeItem = async function (productId) {
        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch(`/api/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                if (data.cart.items.length > 0) {
                    renderCartItems(data.cart.items);
                    updateSummary(data.cart.total);
                    cartCountEl.textContent = data.cart.itemCount;
                } else {
                    showEmptyCart();
                }
            }
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    // Clear cart
    clearCartBtn.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de vaciar el carrito?')) return;

        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                showEmptyCart();
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    });

    // Checkout
    checkoutBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('gym_token');

        if (!token) {
            loginModal.classList.add('active');
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            const response = await fetch('/api/orders/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to Mercado Pago
                window.location.href = data.sandboxInitPoint || data.initPoint;
            } else {
                alert(data.message || 'Error al procesar el pago');
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Proceder al pago';
            }
        } catch (error) {
            console.error('Error during checkout:', error);
            alert('Error al procesar el pago');
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Proceder al pago';
        }
    });

    // Close login modal
    closeLoginModal.addEventListener('click', () => {
        loginModal.classList.remove('active');
    });

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
        }
    });
});
