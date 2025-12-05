// ==================== ADMIN PANEL JAVASCRIPT ====================
// Only runs for admin/developer roles

let adminState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: null,
    users: [],
    plans: [],
    holidays: [],
    settings: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin or developer
    const user = getUser();
    if (user && (user.role === 'admin' || user.role === 'developer')) {
        initAdminPanel();
    }
});

function initAdminPanel() {
    // Show admin navigation
    console.log('Initializing Admin Panel');
    const adminNav = document.getElementById('adminNavSection');
    if (adminNav) {
        adminNav.style.display = 'block';
    }

    // Load admin data when section is activated
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (section === 'admin-users') {
                loadAdminUsers();
                loadAdminStats();
            } else if (section === 'admin-bookings') {
                loadAdminCalendar();
            } else if (section === 'admin-settings') {
                loadSettings();
                loadHolidays();
            }
        });
    });

    // Setup forms and modals
    setupAdminForms();
    setupAdminModals();
    loadPlans();
}

// ==================== USERS MANAGEMENT ====================

async function loadAdminStats() {
    try {
        const stats = await apiRequest('/admin/stats');
        document.getElementById('statTotalUsers').textContent = stats.totalUsers;
        document.getElementById('statActiveSubscriptions').textContent = stats.activeSubscriptions;
        document.getElementById('statPendingSubscriptions').textContent = stats.pendingSubscriptions;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAdminUsers(search = '') {
    try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await apiRequest(`/admin/users${params}`);
        adminState.users = response.users;
        renderUsersTable(response.users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay usuarios</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const plan = user.subscription?.plan?.displayName || 'Sin plan';
        const status = user.subscription?.status || 'inactive';
        const statusText = {
            'al_dia': 'Al día',
            'pendiente': 'Pendiente',
            'suspendido': 'Suspendido',
            'inactive': 'Inactivo'
        }[status] || status;

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-small">${user.name.charAt(0).toUpperCase()}</div>
                        <span>${user.name}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${plan}</td>
                <td><span class="status-badge status-${status}">${statusText}</span></td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>
                    <button class="btn-icon" onclick="openAssignPlanModal('${user._id}', '${user.name}')" title="Asignar Plan">
                        <i class="fa-solid fa-credit-card"></i>
                    </button>
                    <button class="btn-icon" onclick="openAdminBookingModal('${user._id}')" title="Crear Reserva">
                        <i class="fa-solid fa-calendar-plus"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// User search
const userSearchInput = document.getElementById('userSearch');
if (userSearchInput) {
    let searchTimeout;
    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadAdminUsers(e.target.value);
        }, 300);
    });
}

// ==================== PLAN ASSIGNMENT ====================

async function loadPlans() {
    try {
        const plans = await apiRequest('/admin/plans');
        adminState.plans = plans;

        const select = document.getElementById('assignPlanId');
        if (select) {
            select.innerHTML = '<option value="">Selecciona un plan</option>' +
                plans.map(p => `<option value="${p._id}">${p.displayName} - $${p.price.toLocaleString()}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading plans:', error);
    }
}

function openAssignPlanModal(userId, userName) {
    document.getElementById('assignUserId').value = userId;
    document.getElementById('assignUserName').value = userName;
    document.getElementById('assignError').style.display = 'none';
    document.getElementById('assignPlanModal').classList.add('open');
}

// ==================== ADMIN CALENDAR ====================

async function loadAdminCalendar() {
    await loadHolidays();
    renderAdminCalendar();
}

function renderAdminCalendar() {
    const container = document.getElementById('adminCalendarDays');
    if (!container) return;

    const year = adminState.currentYear;
    const month = adminState.currentMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    document.getElementById('adminCurrentMonth').textContent = `${monthNames[month]} ${year}`;

    let html = '';

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        let classes = ['calendar-day'];

        // Check if today
        if (date.toDateString() === today.toDateString()) {
            classes.push('today');
        }

        // Check if Sunday (closed by default)
        if (dayOfWeek === 0) {
            classes.push('closed');
        }

        // Check if holiday
        const isHoliday = adminState.holidays.find(h =>
            new Date(h.date).toDateString() === date.toDateString()
        );
        if (isHoliday) {
            classes.push('holiday');
        }

        // Check if past
        if (date < new Date(today.setHours(0, 0, 0, 0))) {
            classes.push('past');
        }

        html += `<div class="${classes.join(' ')}" data-date="${dateStr}" onclick="selectAdminDate('${dateStr}')">${day}</div>`;
    }

    container.innerHTML = html;
}

async function selectAdminDate(dateStr) {
    console.log('Date selected:', dateStr);
    try {
        adminState.selectedDate = dateStr;

        // Update selected date text
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('selectedDateText').textContent = date.toLocaleDateString('es-ES', options);

        // Load bookings for this date
        await loadAdminBookings(dateStr);
    } catch (error) {
        console.error('Error in selectAdminDate:', error);
        alert('Error al seleccionar fecha: ' + error.message);
    }
}

async function loadAdminBookings(dateStr) {
    try {
        const bookings = await apiRequest(`/admin/bookings?date=${dateStr}`);
        renderAdminBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function renderAdminBookings(bookings) {
    const container = document.getElementById('adminBookingsList');
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<p class="no-data">No hay reservas para este día</p>';
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="admin-booking-item ${b.status}">
            <div class="booking-time">${b.startTime} - ${b.endTime}</div>
            <div class="booking-user">
                <strong>${b.user?.name || 'Usuario'}</strong>
                <span>${b.user?.email || ''}</span>
            </div>
            <div class="booking-status">
                <span class="status-badge status-${b.status}">${b.status}</span>
            </div>
            <button class="btn-icon danger" onclick="cancelAdminBooking('${b._id}')" title="Cancelar">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function cancelAdminBooking(bookingId) {
    if (!confirm('¿Cancelar esta reserva?')) return;

    try {
        await apiRequest(`/admin/bookings/${bookingId}`, { method: 'DELETE' });
        if (adminState.selectedDate) {
            await loadAdminBookings(adminState.selectedDate);
        }
    } catch (error) {
        alert('Error al cancelar: ' + error.message);
    }
}

// Admin calendar navigation
document.getElementById('adminPrevMonth')?.addEventListener('click', () => {
    adminState.currentMonth--;
    if (adminState.currentMonth < 0) {
        adminState.currentMonth = 11;
        adminState.currentYear--;
    }
    renderAdminCalendar();
});

document.getElementById('adminNextMonth')?.addEventListener('click', () => {
    adminState.currentMonth++;
    if (adminState.currentMonth > 11) {
        adminState.currentMonth = 0;
        adminState.currentYear++;
    }
    renderAdminCalendar();
});

// ==================== SETTINGS ====================

async function loadSettings() {
    try {
        const settings = await apiRequest('/admin/settings');
        adminState.settings = settings;

        document.getElementById('openTime').value = settings.openTime || '06:00';
        document.getElementById('closeTime').value = settings.closeTime || '22:00';

        // Set closed days checkboxes
        document.querySelectorAll('input[name="closedDays"]').forEach(cb => {
            cb.checked = settings.closedDays?.includes(parseInt(cb.value));
        });
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function loadHolidays() {
    try {
        const holidays = await apiRequest('/admin/holidays');
        adminState.holidays = holidays;
        renderHolidaysList(holidays);
    } catch (error) {
        console.error('Error loading holidays:', error);
    }
}

function renderHolidaysList(holidays) {
    const container = document.getElementById('holidaysList');
    if (!container) return;

    if (holidays.length === 0) {
        container.innerHTML = '<p class="no-data">No hay feriados registrados</p>';
        return;
    }

    container.innerHTML = holidays.map(h => {
        const date = new Date(h.date);
        return `
            <div class="holiday-item">
                <div class="holiday-date">${date.toLocaleDateString('es-ES')}</div>
                <div class="holiday-name">${h.name}</div>
                <button class="btn-icon danger" onclick="deleteHoliday('${h._id}')" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function deleteHoliday(holidayId) {
    if (!confirm('¿Eliminar este feriado?')) return;

    try {
        await apiRequest(`/admin/holidays/${holidayId}`, { method: 'DELETE' });
        await loadHolidays();
        renderAdminCalendar();
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// ==================== FORMS SETUP ====================

function setupAdminForms() {
    // Hours form
    document.getElementById('hoursForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const closedDays = [];
        document.querySelectorAll('input[name="closedDays"]:checked').forEach(cb => {
            closedDays.push(parseInt(cb.value));
        });

        try {
            await apiRequest('/admin/settings', {
                method: 'PUT',
                body: {
                    openTime: document.getElementById('openTime').value,
                    closeTime: document.getElementById('closeTime').value,
                    closedDays
                }
            });
            alert('Horarios guardados');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    // Holiday form
    document.getElementById('holidayForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            await apiRequest('/admin/holidays', {
                method: 'POST',
                body: {
                    date: document.getElementById('holidayDate').value,
                    name: document.getElementById('holidayName').value
                }
            });
            document.getElementById('holidayForm').reset();
            await loadHolidays();
            renderAdminCalendar();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    // Assign plan form
    document.getElementById('assignPlanForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('assignError');

        try {
            await apiRequest(`/admin/users/${document.getElementById('assignUserId').value}/plan`, {
                method: 'POST',
                body: {
                    planId: document.getElementById('assignPlanId').value,
                    status: document.getElementById('assignStatus').value,
                    months: parseInt(document.getElementById('assignMonths').value)
                }
            });

            document.getElementById('assignPlanModal').classList.remove('open');
            await loadAdminUsers();
            await loadAdminStats();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });

    // Admin booking form
    document.getElementById('adminBookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('adminBookingError');

        try {
            await apiRequest('/admin/bookings', {
                method: 'POST',
                body: {
                    userId: document.getElementById('adminBookingUser').value,
                    date: document.getElementById('adminBookingDate').value,
                    startTime: document.getElementById('adminBookingStart').value,
                    endTime: document.getElementById('adminBookingEnd').value
                }
            });

            if (adminState.selectedDate) {
                await loadAdminBookings(adminState.selectedDate);
            }

            // Close modal and clear forced styles
            const modal = document.getElementById('adminBookingModal');
            modal.classList.remove('open');
            modal.style = ''; // Clear all inline styles
            const content = modal.querySelector('.modal-content');
            if (content) content.style = ''; // Clear content styles

            document.getElementById('adminBookingForm').reset();
            alert('Reserva creada exitosamente');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}

function setupAdminModals() {
    // Close modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.close;
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('open');
                    // Clear forced styles if present
                    modal.style = '';
                    const content = modal.querySelector('.modal-content');
                    if (content) content.style = '';
                }
            }
        });
    });

    // New booking button
    document.getElementById('adminNewBookingBtn')?.addEventListener('click', () => {
        openAdminBookingModal();
    });
}

async function openAdminBookingModal(userId = null) {
    console.log('Opening Booking Modal', { userId });
    try {
        // Load users for dropdown
        const select = document.getElementById('adminBookingUser');
        if (select && adminState.users.length === 0) {
            console.log('Fetching users for modal...');
            const response = await apiRequest('/admin/users');
            console.log('Users response received:', response);
            adminState.users = response.users;
            console.log('Admin state users updated:', adminState.users.length);
        }

        console.log('Populating select dropdown...');
        select.innerHTML = '<option value="">Selecciona un usuario</option>' +
            adminState.users.map(u => `<option value="${u._id}" ${u._id === userId ? 'selected' : ''}>${u.name} - ${u.email}</option>`).join('');

        if (adminState.selectedDate) {
            document.getElementById('adminBookingDate').value = adminState.selectedDate;
        }

        document.getElementById('adminBookingError').style.display = 'none';

        const modal = document.getElementById('adminBookingModal');
        modal.classList.add('open');

        // Robust fix: Ensure modal overlay styles are applied even if CSS fails
        // PRODUCTION ROBUST FIX: Matching the "Red Screen" logic exactly
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Production dark overlay
        modal.style.zIndex = '9999';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        // Force content visibility - CRITICAL based on Red Screen success
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.zIndex = '10000';
            content.style.position = 'relative';
            content.style.backgroundColor = '#1f2937'; // Match dashboard theme (dark) or '#fff' if light
        }

    } catch (error) {
        console.error('Error opening booking modal:', error);
        alert('Error al abrir modal: ' + error.message);
    }
}
// Make functions global for inline onclick handlers
window.openAssignPlanModal = openAssignPlanModal;
window.openAdminBookingModal = openAdminBookingModal;
window.selectAdminDate = selectAdminDate;
window.cancelAdminBooking = cancelAdminBooking;
window.deleteHoliday = deleteHoliday;
window.loadAdminUsers = loadAdminUsers; // Helpful for reloads
window.loadAdminCalendar = loadAdminCalendar; // Helpful for reloads
