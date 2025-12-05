// Admin Reports Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Only run if we're on the dashboard page with admin reports section
    if (!document.getElementById('admin-reports')) return;

    let salesChart = null;
    let subscriptionsChart = null;

    // Check if user is admin when section becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active')) {
                loadReports();
            }
        });
    });

    const adminReportsSection = document.getElementById('admin-reports');
    if (adminReportsSection) {
        observer.observe(adminReportsSection, { attributes: true, attributeFilter: ['class'] });
    }

    // Date filter
    const applyDateFilter = document.getElementById('applyDateFilter');
    if (applyDateFilter) {
        applyDateFilter.addEventListener('click', () => {
            loadReports();
        });
    }

    // Load all reports
    async function loadReports() {
        const token = localStorage.getItem('gym_token');
        if (!token) return;

        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        await Promise.all([
            loadBalance(token, startDate, endDate),
            loadStock(token),
            loadOrders(token),
            loadCharts(token)
        ]);
    }

    // Load balance data
    async function loadBalance(token, startDate, endDate) {
        try {
            let url = '/api/reports/balance';
            if (startDate || endDate) {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById('reportMarketSales').textContent =
                    '$' + data.marketRevenue.toLocaleString('es-AR');
                document.getElementById('reportOrdersCount').textContent =
                    data.ordersCount + ' órdenes';
                document.getElementById('reportSubsRevenue').textContent =
                    '$' + data.subscriptionRevenue.toLocaleString('es-AR');
                document.getElementById('reportSubsCount').textContent =
                    data.subscriptionsCount + ' activas';
                document.getElementById('reportTotalBalance').textContent =
                    '$' + data.totalRevenue.toLocaleString('es-AR');
            }
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    }

    // Load stock data
    async function loadStock(token) {
        try {
            const response = await fetch('/api/reports/stock', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById('reportLowStock').textContent = data.lowStock;
            }
        } catch (error) {
            console.error('Error loading stock:', error);
        }
    }

    // Load orders
    async function loadOrders(token) {
        try {
            const response = await fetch('/api/reports/orders?limit=10', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                renderOrders(data.orders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    // Render orders table
    function renderOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        tbody.innerHTML = orders.map(order => {
            const statusClass = {
                'pending': 'pending',
                'paid': 'success',
                'shipped': 'info',
                'delivered': 'success',
                'cancelled': 'danger'
            }[order.status] || 'pending';

            const statusLabel = {
                'pending': 'Pendiente',
                'paid': 'Pagado',
                'shipped': 'Enviado',
                'delivered': 'Entregado',
                'cancelled': 'Cancelado'
            }[order.status] || order.status;

            return `
                <tr>
                    <td>#${order._id.slice(-6).toUpperCase()}</td>
                    <td>${order.user?.name || 'N/A'}</td>
                    <td>${order.items.length} producto(s)</td>
                    <td>$${order.total.toLocaleString('es-AR')}</td>
                    <td>
                        <select class="status-select ${statusClass}" onchange="updateOrderStatus('${order._id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Pagado</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Enviado</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Entregado</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </td>
                    <td>${new Date(order.createdAt).toLocaleDateString('es-AR')}</td>
                    <td>
                        <button class="btn-icon" onclick="viewOrder('${order._id}')" title="Ver detalle">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Update order status
    window.updateOrderStatus = async function (orderId, status) {
        const token = localStorage.getItem('gym_token');

        try {
            const response = await fetch(`/api/reports/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                alert('Error al actualizar estado');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    // View order details
    window.viewOrder = function (orderId) {
        // Could open a modal with order details
        alert('Ver orden: ' + orderId);
    };

    // Load charts
    async function loadCharts(token) {
        try {
            const response = await fetch('/api/reports/charts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                renderSalesChart(data.labels, data.sales);
                renderSubscriptionsChart(data.labels, data.subscriptions);
            }
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    // Render sales chart
    function renderSalesChart(labels, salesData) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: salesData.label,
                    data: salesData.data,
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }

    // Render subscriptions chart
    function renderSubscriptionsChart(labels, subsData) {
        const ctx = document.getElementById('subscriptionsChart');
        if (!ctx) return;

        if (subscriptionsChart) {
            subscriptionsChart.destroy();
        }

        subscriptionsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: subsData.label,
                    data: subsData.data,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }
});
