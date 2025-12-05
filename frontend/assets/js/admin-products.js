// Admin Products Management
document.addEventListener('DOMContentLoaded', () => {
    // Only run if we're on the dashboard page with admin products section
    if (!document.getElementById('admin-products')) return;

    // Elements
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const newProductBtn = document.getElementById('newProductBtn');
    const productsTableBody = document.getElementById('productsTableBody');
    const sizesSection = document.getElementById('sizesSection');
    const simpleStockSection = document.getElementById('simpleStockSection');
    const sizesGrid = document.getElementById('sizesGrid');
    const categorySelect = document.getElementById('productCategory');
    const imageFileInput = document.getElementById('productImageFile');
    const imagePreview = document.getElementById('productImagePreview');
    const uploadImageBtn = document.getElementById('uploadImageBtn');

    // Sizes definitions
    const CLOTHING_SIZES = ['S', 'M', 'L', 'XL'];
    const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43'];

    // Check if user is admin when section becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active')) {
                loadProducts();
            }
        });
    });

    const adminProductsSection = document.getElementById('admin-products');
    if (adminProductsSection) {
        observer.observe(adminProductsSection, { attributes: true, attributeFilter: ['class'] });
    }

    // Load products
    async function loadProducts() {
        const token = localStorage.getItem('gym_token');
        if (!token) {
            console.error('No token found');
            return;
        }

        try {
            const response = await fetch('/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                renderProducts(data.products);
                updateStats(data.products);
            } else if (data.products) {
                // In case success flag is missing
                renderProducts(data.products);
                updateStats(data.products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Render products table
    function renderProducts(products) {
        productsTableBody.innerHTML = products.map(product => {
            const stock = product.sizes?.length > 0
                ? product.sizes.reduce((sum, s) => sum + s.stock, 0)
                : product.stock;

            const stockClass = stock === 0 ? 'out' : stock < 10 ? 'low' : 'ok';

            return `
                <tr>
                    <td><img src="${product.image}" alt="${product.name}" class="product-thumb"></td>
                    <td>${product.name}</td>
                    <td>${getCategoryLabel(product.category)}</td>
                    <td>$${product.price.toLocaleString('es-AR')}</td>
                    <td><span class="stock-badge ${stockClass}">${stock}</span></td>
                    <td><span class="status-badge ${product.active ? 'active' : 'inactive'}">${product.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions">
                        <button class="btn-icon edit" onclick="editProduct('${product._id}')" title="Editar">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteProduct('${product._id}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Update stats
    function updateStats(products) {
        document.getElementById('statTotalProducts').textContent = products.length;

        const lowStock = products.filter(p => {
            const stock = p.sizes?.length > 0
                ? p.sizes.reduce((sum, s) => sum + s.stock, 0)
                : p.stock;
            return stock > 0 && stock < 10;
        }).length;

        const outOfStock = products.filter(p => {
            const stock = p.sizes?.length > 0
                ? p.sizes.reduce((sum, s) => sum + s.stock, 0)
                : p.stock;
            return stock === 0;
        }).length;

        document.getElementById('statLowStock').textContent = lowStock;
        document.getElementById('statOutOfStock').textContent = outOfStock;
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

    // Handle category change - show/hide sizes
    categorySelect.addEventListener('change', (e) => {
        const category = e.target.value;

        if (category === 'indumentaria' || category === 'zapatillas') {
            sizesSection.style.display = 'block';
            simpleStockSection.style.display = 'none';
            renderSizesGrid(category === 'zapatillas' ? SHOE_SIZES : CLOTHING_SIZES);
        } else {
            sizesSection.style.display = 'none';
            simpleStockSection.style.display = 'block';
        }
    });

    // Render sizes grid
    function renderSizesGrid(sizes, currentSizes = []) {
        sizesGrid.innerHTML = sizes.map(size => {
            const existing = currentSizes.find(s => s.size === size);
            const stock = existing ? existing.stock : 0;
            return `
                <div class="size-input">
                    <label>${size}</label>
                    <input type="number" name="size_${size}" value="${stock}" min="0" placeholder="0">
                </div>
            `;
        }).join('');
    }

    // Image upload
    uploadImageBtn.addEventListener('click', () => {
        imageFileInput.click();
    });

    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                document.getElementById('productImage').value = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // New product button
    newProductBtn.addEventListener('click', () => {
        productForm.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
        imagePreview.src = 'https://via.placeholder.com/200x200?text=Producto';
        document.getElementById('productImage').value = '';
        sizesSection.style.display = 'none';
        simpleStockSection.style.display = 'block';
        productModal.classList.add('active');
    });

    // Edit product
    window.editProduct = async function (id) {
        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch(`/api/products/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const product = await response.json();

            document.getElementById('productId').value = product._id;
            document.getElementById('productModalTitle').textContent = 'Editar Producto';
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productActive').checked = product.active;
            imagePreview.src = product.image;
            document.getElementById('productImage').value = product.image;

            // Handle sizes
            if (product.category === 'indumentaria' || product.category === 'zapatillas') {
                sizesSection.style.display = 'block';
                simpleStockSection.style.display = 'none';
                const sizesArray = product.category === 'zapatillas' ? SHOE_SIZES : CLOTHING_SIZES;
                renderSizesGrid(sizesArray, product.sizes || []);
            } else {
                sizesSection.style.display = 'none';
                simpleStockSection.style.display = 'block';
                document.getElementById('productStock').value = product.stock;
            }

            productModal.classList.add('active');
        } catch (error) {
            console.error('Error loading product:', error);
            alert('Error al cargar el producto');
        }
    };

    // Delete product
    window.deleteProduct = async function (id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadProducts();
            } else {
                alert('Error al eliminar el producto');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar el producto');
        }
    };

    // Submit product form
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('gym_token');
        const productId = document.getElementById('productId').value;
        const category = document.getElementById('productCategory').value;

        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: category,
            image: document.getElementById('productImage').value || 'https://via.placeholder.com/300x300?text=Producto',
            active: document.getElementById('productActive').checked
        };

        // Handle sizes or simple stock
        if (category === 'indumentaria' || category === 'zapatillas') {
            const sizes = [];
            const sizeInputs = sizesGrid.querySelectorAll('input[type="number"]');
            sizeInputs.forEach(input => {
                const sizeName = input.name.replace('size_', '');
                const stock = parseInt(input.value) || 0;
                if (stock > 0) {
                    sizes.push({ size: sizeName, stock });
                }
            });
            productData.sizes = sizes;
            productData.stock = sizes.reduce((sum, s) => sum + s.stock, 0);
        } else {
            productData.stock = parseInt(document.getElementById('productStock').value) || 0;
            productData.sizes = [];
        }

        try {
            const url = productId ? `/api/products/${productId}` : '/api/products';
            const method = productId ? 'PUT' : 'POST';

            // Verify we have token
            if (!token) {
                document.getElementById('productError').textContent = 'No has iniciado sesión. Por favor, re-inicia sesión.';
                document.getElementById('productError').style.display = 'block';
                return;
            }

            console.log('Sending product data:', productData);
            console.log('Token exists:', !!token);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            console.log('Response:', result);

            if (response.ok) {
                productModal.classList.remove('active');
                loadProducts();
            } else {
                // Show specific error message
                const errorMsg = result.message || 'Error al guardar. Verifica que seas admin/developer.';
                document.getElementById('productError').textContent = errorMsg;
                document.getElementById('productError').style.display = 'block';
            }
        } catch (error) {
            console.error('Error saving product:', error);
            document.getElementById('productError').textContent = 'Error de conexión al guardar el producto';
            document.getElementById('productError').style.display = 'block';
        }
    });

    // Close modal
    document.querySelectorAll('[data-close="productModal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            productModal.classList.remove('active');
        });
    });

    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.classList.remove('active');
        }
    });
});
