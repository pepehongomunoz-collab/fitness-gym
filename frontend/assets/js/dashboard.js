// Dashboard functionality
let currentUser = null;
let currentMonth = new Date();

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!requireAuth()) return;

    // Load user data
    loadUserData();

    // Setup navigation
    setupNavigation();

    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Setup mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // Setup booking modal
    setupBookingModal();

    // Setup profile section
    setupProfileForm();

    // Setup calendar
    setupCalendar();
});

// Load user data
async function loadUserData() {
    try {
        currentUser = await authAPI.me();

        // Update UI with user info
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];

        // Update Header Avatar
        if (currentUser.avatar) {
            const avatarContainer = document.getElementById('userAvatar');
            avatarContainer.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
        }

        // Populate Profile Form
        document.getElementById('profileName').value = currentUser.name;
        document.getElementById('profileEmail').value = currentUser.email;
        document.getElementById('profilePhone').value = currentUser.phone || '';
        document.getElementById('profileAddress').value = currentUser.address || '';
        document.getElementById('profileHeight').value = currentUser.height || '';
        document.getElementById('profileWeight').value = currentUser.weight || '';

        document.getElementById('profileNameDisplay').textContent = currentUser.name;
        document.getElementById('profileEmailDisplay').textContent = currentUser.email;
        if (currentUser.avatar) {
            document.getElementById('profileAvatarPreview').src = currentUser.avatar;
        }

        // Load all dashboard data
        loadOverviewData();
    } catch (error) {
        console.error('Error loading user:', error);
        logout();
    }
}

// Load overview data
async function loadOverviewData() {
    loadPlanData();
    loadRoutineData();
    loadBookingsData();
    loadNutritionData();
}

// Load plan data
async function loadPlanData() {
    try {
        const response = await subscriptionsAPI.getMine();

        const planValue = document.getElementById('overviewPlan');
        const planStatus = document.getElementById('overviewPlanStatus');
        const planContent = document.getElementById('planContent');

        if (response.hasSubscription) {
            const sub = response.subscription;
            planValue.textContent = sub.plan.displayName;
            planStatus.textContent = getStatusText(sub.status);
            planStatus.className = `status-badge status-${sub.status}`;

            // Render full plan section
            planContent.innerHTML = renderPlanCard(sub);
        } else {
            planValue.textContent = 'Sin plan';
            planStatus.textContent = 'Inactivo';
            planStatus.className = 'status-badge status-inactive';

            planContent.innerHTML = `
                <div class="no-data-card">
                    <i class="fa-solid fa-credit-card"></i>
                    <h3>No tienes un plan asignado</h3>
                    <p>Contacta con nuestro equipo para contratar un plan</p>
                    <a href="/" class="btn btn-primary">Ver planes</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading plan:', error);
    }
}

// Render plan card
function renderPlanCard(subscription) {
    const plan = subscription.plan;
    const statusClass = `status-${subscription.status}`;
    const statusText = getStatusText(subscription.status);

    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    return `
        <div class="plan-detail-card ${plan.name}">
            <div class="plan-header">
                <div class="plan-badge ${plan.name}">
                    <i class="fa-solid fa-crown"></i>
                    ${plan.displayName}
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            
            <div class="plan-price">
                <span class="currency">$</span>
                <span class="amount">${plan.price.toLocaleString()}</span>
                <span class="period">/mes</span>
            </div>
            
            <div class="plan-info">
                <div class="info-row">
                    <span class="label">Vencimiento:</span>
                    <span class="value">${endDate.toLocaleDateString('es-AR')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Días restantes:</span>
                    <span class="value ${daysRemaining < 7 ? 'warning' : ''}">${daysRemaining} días</span>
                </div>
                <div class="info-row">
                    <span class="label">Tiempo diario:</span>
                    <span class="value">${plan.maxDailyMinutes === 1440 ? 'Ilimitado' : plan.maxDailyMinutes / 60 + ' horas'}</span>
                </div>
            </div>
            
            <div class="plan-features">
                <h4>Incluye:</h4>
                <ul>
                    ${plan.features.map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Load routine data
async function loadRoutineData() {
    try {
        const response = await routinesAPI.getMine();

        const routineValue = document.getElementById('overviewRoutine');
        const routineContent = document.getElementById('routineContent');

        if (response.hasRoutine) {
            const routine = response.routine;
            routineValue.textContent = routine.name;
            routineContent.innerHTML = renderRoutine(routine);
        } else {
            routineValue.textContent = 'Sin rutina';
            routineContent.innerHTML = `
                <div class="no-data-card">
                    <i class="fa-solid fa-dumbbell"></i>
                    <h3>No tienes una rutina asignada</h3>
                    <p>Tu entrenador te asignará una rutina personalizada</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading routine:', error);
    }
}

// Render routine
function renderRoutine(routine) {
    const goalNames = {
        hipertrofia: 'Hipertrofia',
        fuerza: 'Fuerza',
        resistencia: 'Resistencia',
        perdida_grasa: 'Pérdida de grasa',
        mantenimiento: 'Mantenimiento'
    };

    return `
        <div class="routine-header">
            <h3>${routine.name}</h3>
            <span class="routine-goal">${goalNames[routine.goal] || routine.goal}</span>
            <p class="routine-trainer">Asignado por: ${routine.trainer.name}</p>
        </div>
        
        <div class="routine-days">
            ${routine.days.map(day => `
                <div class="routine-day">
                    <div class="day-header">
                        <h4>${capitalizeFirst(day.day)}</h4>
                        <span class="muscle-group">${day.muscleGroup}</span>
                    </div>
                    <table class="exercises-table">
                        <thead>
                            <tr>
                                <th>Ejercicio</th>
                                <th>Series</th>
                                <th>Reps</th>
                                <th>Peso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${day.exercises.map(ex => `
                                <tr>
                                    <td>${ex.name}</td>
                                    <td>${ex.sets}</td>
                                    <td>${ex.reps}</td>
                                    <td>${ex.weight || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>
        
        ${routine.generalNotes ? `
            <div class="routine-notes">
                <h4>Notas del entrenador</h4>
                <p>${routine.generalNotes}</p>
            </div>
        ` : ''}
    `;
}

// Load bookings data
async function loadBookingsData() {
    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const bookings = await bookingsAPI.getMine(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        const nextBookingEl = document.getElementById('overviewNextBooking');
        const bookingsList = document.getElementById('bookingsList');

        const upcomingBookings = bookings.filter(b =>
            b.status !== 'cancelled' && new Date(b.date) >= new Date()
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcomingBookings.length > 0) {
            const next = upcomingBookings[0];
            const date = new Date(next.date);
            nextBookingEl.textContent = `${date.toLocaleDateString('es-AR')} ${next.startTime}`;
        } else {
            nextBookingEl.textContent = 'Sin reservas';
        }

        // Render bookings list
        if (bookings.length > 0) {
            bookingsList.innerHTML = bookings.map(b => renderBookingItem(b)).join('');
        } else {
            bookingsList.innerHTML = `
                <p class="no-bookings">No tienes reservas programadas</p>
            `;
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Render booking item
function renderBookingItem(booking) {
    const date = new Date(booking.date);
    const isPast = date < new Date();
    const statusClass = booking.status === 'cancelled' ? 'cancelled' : (isPast ? 'completed' : 'upcoming');

    return `
        <div class="booking-item ${statusClass}">
            <div class="booking-date">
                <span class="day">${date.getDate()}</span>
                <span class="month">${date.toLocaleDateString('es-AR', { month: 'short' })}</span>
            </div>
            <div class="booking-info">
                <span class="time">${booking.startTime} - ${booking.endTime}</span>
                <span class="duration">${booking.durationMinutes} min</span>
            </div>
            ${!isPast && booking.status !== 'cancelled' ? `
                <button class="btn-cancel" onclick="cancelBooking('${booking._id}')">
                    <i class="fa-solid fa-times"></i>
                </button>
            ` : ''}
        </div>
    `;
}

// Load nutrition data
async function loadNutritionData() {
    try {
        const response = await nutritionAPI.getMine();

        const nutritionValue = document.getElementById('overviewNutrition');
        const nutritionContent = document.getElementById('nutritionContent');

        if (response.hasPlan) {
            const plan = response.plan;
            nutritionValue.textContent = plan.name;
            nutritionContent.innerHTML = renderNutritionPlan(plan);
        } else {
            nutritionValue.textContent = 'Sin plan';
            nutritionContent.innerHTML = `
                <div class="no-data-card">
                    <i class="fa-solid fa-apple-whole"></i>
                    <h3>No tienes un plan nutricional asignado</h3>
                    <p>Nuestro equipo de nutricionistas te asignará un plan personalizado</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading nutrition:', error);
    }
}

// Render nutrition plan
function renderNutritionPlan(plan) {
    const goalNames = {
        perdida_peso: 'Pérdida de peso',
        ganancia_muscular: 'Ganancia muscular',
        mantenimiento: 'Mantenimiento',
        definicion: 'Definición'
    };

    return `
        <div class="nutrition-header">
            <h3>${plan.name}</h3>
            <span class="nutrition-goal">${goalNames[plan.goal] || plan.goal}</span>
        </div>
        
        <div class="nutrition-macros">
            <div class="macro-item calories">
                <span class="macro-value">${plan.dailyCalorieTarget || '-'}</span>
                <span class="macro-label">Calorías/día</span>
            </div>
            ${plan.macros ? `
                <div class="macro-item protein">
                    <span class="macro-value">${plan.macros.protein}%</span>
                    <span class="macro-label">Proteína</span>
                </div>
                <div class="macro-item carbs">
                    <span class="macro-value">${plan.macros.carbs}%</span>
                    <span class="macro-label">Carbohidratos</span>
                </div>
                <div class="macro-item fat">
                    <span class="macro-value">${plan.macros.fat}%</span>
                    <span class="macro-label">Grasas</span>
                </div>
            ` : ''}
        </div>
        
        ${plan.weeklyPlan && plan.weeklyPlan.length > 0 ? `
            <div class="weekly-plan">
                <h4>Plan Semanal</h4>
                <div class="nutrition-days">
                    ${plan.weeklyPlan.map(day => `
                        <div class="nutrition-day">
                            <h5>${capitalizeFirst(day.day)}</h5>
                            ${day.meals.map(meal => `
                                <div class="meal">
                                    <span class="meal-type">${capitalizeFirst(meal.type)}</span>
                                    <ul class="meal-foods">
                                        ${meal.foods.map(food => `
                                            <li>${food.name} ${food.portion ? `(${food.portion})` : ''}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${plan.generalNotes ? `
            <div class="nutrition-notes">
                <h4>Notas del nutricionista</h4>
                <p>${plan.generalNotes}</p>
            </div>
        ` : ''}
    `;
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding section
            document.querySelectorAll('.dashboard-section').forEach(sec => {
                sec.classList.remove('active');
            });
            document.getElementById(section).classList.add('active');

            // Update page title
            const titles = {
                overview: 'Dashboard',
                plan: 'Mi Plan',
                routine: 'Mi Rutina',
                bookings: 'Reserva de Turnos',
                nutrition: 'Plan Nutricional',
                'admin-users': 'Gestión de Usuarios',
                'admin-bookings': 'Gestión de Reservas',
                'admin-settings': 'Configuración'
            };
            document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

            // Close mobile menu
            document.querySelector('.sidebar').classList.remove('open');
        });
    });
}

// Setup booking modal
function setupBookingModal() {
    const modal = document.getElementById('bookingModal');
    const openBtn = document.getElementById('newBookingBtn');
    const closeBtn = document.getElementById('closeBookingModal');
    const form = document.getElementById('bookingForm');
    const dateInput = document.getElementById('bookingDate');

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    openBtn.addEventListener('click', () => {
        modal.classList.add('open');
        // PRODUCTION ROBUST FIX: User-side matching Admin fix
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.zIndex = '9999';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.zIndex = '10000';
            content.style.position = 'relative';
            content.style.backgroundColor = '#1f2937';
        }

        loadAvailableSlots(dateInput.value);
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        modal.style = ''; // Clean forced styles
        const content = modal.querySelector('.modal-content');
        if (content) content.style = '';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
            modal.style = ''; // Clean forced styles
            const content = modal.querySelector('.modal-content');
            if (content) content.style = '';
        }
    });

    dateInput.addEventListener('change', () => {
        loadAvailableSlots(dateInput.value);
    });

    form.addEventListener('submit', handleBooking);
}

// Load available slots
async function loadAvailableSlots(date) {
    const timeSelect = document.getElementById('bookingTime');
    timeSelect.innerHTML = '<option value="">Cargando...</option>';

    try {
        const response = await bookingsAPI.getAvailable(date);

        if (response.message) {
            timeSelect.innerHTML = `<option value="">${response.message}</option>`;
            return;
        }

        const availableSlots = response.slots.filter(s => s.available);

        if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
        } else {
            timeSelect.innerHTML = '<option value="">Selecciona un horario</option>' +
                availableSlots.map(slot => `
                    <option value="${slot.time}">${slot.time}</option>
                `).join('');
        }
    } catch (error) {
        timeSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
    }
}

// Handle booking
async function handleBooking(e) {
    e.preventDefault();

    const date = document.getElementById('bookingDate').value;
    const startTime = document.getElementById('bookingTime').value;
    const duration = parseInt(document.getElementById('bookingDuration').value);
    const errorDiv = document.getElementById('bookingError');

    // Calculate end time
    const [hours, mins] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + mins + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    try {
        await bookingsAPI.create({ date, startTime, endTime });

        const modal = document.getElementById('bookingModal');
        modal.classList.remove('open');
        modal.style = ''; // Clean forced styles
        const content = modal.querySelector('.modal-content');
        if (content) content.style = '';

        loadBookingsData();
        renderCalendar();

        alert('¡Reserva confirmada!');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

// Cancel booking
window.cancelBooking = async function (id) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    try {
        await bookingsAPI.cancel(id);
        loadBookingsData();
        renderCalendar();
    } catch (error) {
        alert(error.message);
    }
}

// Setup calendar
function setupCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
}

// Render calendar
function renderCalendar() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    document.getElementById('currentMonth').textContent =
        `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysContainer = document.getElementById('calendarDays');

    let html = '';

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today && !isToday;
        const isSunday = date.getDay() === 0;

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isSunday ? 'closed' : ''}"
                 ${!isPast && !isSunday ? `onclick="selectCalendarDate('${date.toISOString().split('T')[0]}')"` : ''}>
                ${day}
            </div>
        `;
    }

    daysContainer.innerHTML = html;
}

// Select calendar date
window.selectCalendarDate = function (date) {
    document.getElementById('bookingDate').value = date;
    const modal = document.getElementById('bookingModal');
    modal.classList.add('open');

    // PRODUCTION ROBUST FIX: User-side matching Admin fix
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '9999';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const content = modal.querySelector('.modal-content');
    if (content) {
        content.style.display = 'block';
        content.style.visibility = 'visible';
        content.style.opacity = '1';
        content.style.zIndex = '10000';
        content.style.position = 'relative';
        content.style.backgroundColor = '#1f2937';
    }

    loadAvailableSlots(date);
}

// Helper functions
function getStatusText(status) {
    const texts = {
        'al_dia': 'Al día',
        'pendiente': 'Pendiente',
        'suspendido': 'Suspendido'
    };
    return texts[status] || status;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
