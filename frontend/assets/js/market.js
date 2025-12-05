// Market page functionality
document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentFilters = {
        category: '',
        minPrice: '',
        maxPrice: '',
        search: '',
        sort: ''
    };

    // Elements
    const productsGrid = document.getElementById('productsGrid');
    const productsCount = document.getElementById('productsCount');
    const searchInput = document.getElementById('searchInput');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const applyPriceBtn = document.getElementById('applyPrice');
    const sortSelect = document.getElementById('sortSelect');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const cartCountEl = document.getElementById('cartCount');
    const toast = document.getElementById('toast');

    // Initialize
    loadProducts();
    updateCartCount();
    updateAuthIcon();

    // Load products with filters
    async function loadProducts() {
        try {
            productsGrid.innerHTML = `
                <div class="loading-spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <p>Cargando productos...</p>
                </div>
            `;

            const params = new URLSearchParams();
            if (currentFilters.category) params.append('category', currentFilters.category);
            if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
            if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
            if (currentFilters.search) params.append('search', currentFilters.search);
            if (currentFilters.sort) params.append('sort', currentFilters.sort);

            const response = await fetch(`/api/products?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                renderProducts(data.products);
                productsCount.textContent = `${data.count} productos encontrados`;
            } else {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <i class="fa-solid fa-box-open"></i>
                        <h3>No se encontraron productos</h3>
                        <p>Intenta con otros filtros o busca algo diferente</p>
                    </div>
                `;
                productsCount.textContent = '0 productos encontrados';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            productsGrid.innerHTML = `
                <div class="error-message">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    <p>Error al cargar productos</p>
                </div>
            `;
        }
    }

    // Render products grid
    function renderProducts(products) {
        productsGrid.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product._id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    <span class="product-category">${getCategoryLabel(product.category)}</span>
                    ${product.stock < 5 ? '<span class="low-stock">¡Últimas unidades!</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-footer">
                        <span class="product-price">$${product.price.toLocaleString('es-AR')}</span>
                        <button class="btn btn-add-cart" onclick="addToCart('${product._id}')" ${product.stock === 0 ? 'disabled' : ''}>
                            ${product.stock === 0 ? 'Sin stock' : '<i class="fa-solid fa-cart-plus"></i> Agregar'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
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

    // Add to cart
    window.addToCart = async function (productId) {
        const token = localStorage.getItem('gym_token');

        if (!token) {
            showToast('Inicia sesión para agregar al carrito', 'warning');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId, quantity: 1 })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Producto agregado al carrito', 'success');
                updateCartCount(data.cart.itemCount);
            } else {
                showToast(data.message || 'Error al agregar', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Error al agregar al carrito', 'error');
        }
    };

    // Update cart count in header
    async function updateCartCount(count) {
        if (count !== undefined) {
            cartCountEl.textContent = count;
            return;
        }

        const token = localStorage.getItem('gym_token');
        if (!token) {
            cartCountEl.textContent = '0';
            return;
        }

        try {
            const response = await fetch('/api/cart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                cartCountEl.textContent = data.cart.itemCount || 0;
            }
        } catch (error) {
            cartCountEl.textContent = '0';
        }
    }

    // Update auth icon based on login status
    function updateAuthIcon() {
        const token = localStorage.getItem('gym_token');
        const authIcon = document.getElementById('authIcon');

        if (token) {
            authIcon.href = '/dashboard';
            authIcon.title = 'Mi Dashboard';
        }
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        const toastMessage = document.getElementById('toastMessage');
        const icon = toast.querySelector('i');

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;

        if (type === 'success') {
            icon.className = 'fa-solid fa-check-circle';
        } else if (type === 'warning') {
            icon.className = 'fa-solid fa-exclamation-triangle';
        } else {
            icon.className = 'fa-solid fa-times-circle';
        }

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Event Listeners

    // Search with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            loadProducts();
        }, 300);
    });

    // Category filter
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.category = btn.dataset.category;
            loadProducts();
        });
    });

    // Price filter
    applyPriceBtn.addEventListener('click', () => {
        currentFilters.minPrice = minPriceInput.value;
        currentFilters.maxPrice = maxPriceInput.value;
        loadProducts();
    });

    // Sort
    sortSelect.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        loadProducts();
    });

    // Clear filters
    clearFiltersBtn.addEventListener('click', () => {
        currentFilters = {
            category: '',
            minPrice: '',
            maxPrice: '',
            search: '',
            sort: ''
        };

        searchInput.value = '';
        minPriceInput.value = '';
        maxPriceInput.value = '';
        sortSelect.value = '';
        categoryBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.category-btn[data-category=""]').classList.add('active');

        loadProducts();
    });
});
