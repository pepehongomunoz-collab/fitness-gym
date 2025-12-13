document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserData();
    setupLogout();
    setupProfileForm();
    setupCalendar();
    setupTimer();
    setupNavigation();
});

// Load user data
async function loadUserData() {
    try {
        const currentUser = await authAPI.getMe();
        if (!currentUser) {
            window.location.href = '/login.html';
            return;
        }

        // Update UI with user info
        // Header & Overview
        const userNameElements = ['userName', 'welcomeName', 'profileNameDisplay'];
        userNameElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = currentUser.name;
        });

        const userAvatarElements = ['userAvatar', 'profileAvatarPreview']; // Assuming userAvatar is a container or img?
        // Header avatar is a div with icon, Profile is img
        const headerAvatar = document.querySelector('#userAvatar'); // Div
        const profileAvatar = document.getElementById('profileAvatarPreview'); // Img

        if (currentUser.avatar) {
            if (headerAvatar) headerAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
            if (profileAvatar) profileAvatar.src = currentUser.avatar;
        }

        document.getElementById('profileName').value = currentUser.name || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profileEmailDisplay').textContent = currentUser.email || '';

        // Populate objectives
        if (currentUser.objectives && Array.isArray(currentUser.objectives)) {
            const checkboxes = document.querySelectorAll('input[name="objectives"]');
            checkboxes.forEach(cb => {
                cb.checked = currentUser.objectives.includes(cb.value);
            });
        }

        // Populate new profile fields
        const genderSelect = document.getElementById('profileGender');
        if (genderSelect) genderSelect.value = currentUser.gender || '';

        const birthInput = document.getElementById('profileBirthDate');
        if (birthInput && currentUser.birthDate) {
            birthInput.value = new Date(currentUser.birthDate).toISOString().split('T')[0];
        }

        const initialWeightInput = document.getElementById('profileInitialWeight');
        if (initialWeightInput) initialWeightInput.value = currentUser.initialWeight || '';

        document.getElementById('profileWeight').value = currentUser.weight || '';
        document.getElementById('profileHeight').value = currentUser.height || '';
        document.getElementById('profileAddress').value = currentUser.address || '';
        document.getElementById('profilePhone').value = currentUser.phone || '';

        // Render Overview Stats
        renderBodyStats(currentUser);

        // Load all dashboard data
        loadOverviewData();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
    }
}

// Setup logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authAPI.logout();
        });
    }
}

// Setup Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.dataset.section;

            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');

                    // Load section specific data
                    if (targetSection === 'plan') loadPlanDetails();
                    if (targetSection === 'bookings') loadBookings();
                    if (targetSection === 'nutrition') loadNutritionDetails();
                }
            });
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// Load dashboard overview data
async function loadOverviewData() {
    try {
        // Fix: Pass today's date to avoid /undefined error
        const today = new Date().toISOString().split('T')[0];
        const bookings = await bookingsAPI.getAvailable(today);

        const nutritionText = document.getElementById('overviewNutrition');
        if (nutritionText) nutritionText.textContent = 'Plan Estándar';

        try {
            const sub = await subscriptionsAPI.getMine();
            console.log('Subscription data received:', sub); // DEBUG
            const planDisplay = document.getElementById('overviewPlan');
            const planStatus = document.getElementById('overviewPlanStatus');

            // Handle backend response structure { hasSubscription: true, subscription: {...} }
            const subscriptionData = sub.subscription || sub; // Fallback if API changes

            if (subscriptionData && subscriptionData.plan) {
                if (planDisplay) planDisplay.textContent = subscriptionData.plan.displayName || subscriptionData.plan.name;
                if (planStatus) {
                    const status = subscriptionData.status;
                    planStatus.textContent = (status === 'al_dia' || status === 'active') ? 'Activo' : 'Pendiente';
                    planStatus.className = `status-badge ${(status === 'al_dia' || status === 'active') ? 'status-active' : 'status-pending'}`;
                }
            } else {
                if (planDisplay) planDisplay.textContent = 'Sin Plan';
                if (planStatus) {
                    planStatus.textContent = '-';
                    planStatus.className = 'status-badge';
                }
            }
        } catch (error) {
            console.error('Error loading subscription:', error);
            const planDisplay = document.getElementById('overviewPlan');
            if (planDisplay) planDisplay.textContent = 'Sin Plan';
        }

        // Load Routine
        try {
            const res = await routinesAPI.getMine();
            const routineContainer = document.getElementById('routineContent');
            const overviewRoutine = document.getElementById('overviewRoutine');

            let routineName = 'Sin rutina';

            if (res.hasRoutine && res.routine) {
                routineName = res.routine.name;
                if (routineContainer) routineContainer.innerHTML = renderRoutine(res.routine);
            } else if (routineContainer) {
                routineContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-dumbbell"></i>
                        <h3>Sin Rutina Asignada</h3>
                        <p>${res.message || 'Tu entrenador aún no ha cargado tu plan.'}</p>
                    </div>
                `;
            }

            if (overviewRoutine) overviewRoutine.textContent = routineName;

        } catch (error) {
            console.error('Error loading routine:', error);
            if (document.getElementById('routineContent')) {
                document.getElementById('routineContent').innerHTML = '<p>Error al cargar la rutina.</p>';
            }
        }

    } catch (error) {
        console.error('Error loading overview:', error);
    }

    // Load Nutrition Section Content
    try {
        const nutritionContainer = document.getElementById('nutritionContent');
        if (nutritionContainer) {
            try {
                // Try to get real plan, or fall back to default
                const nutrition = await nutritionAPI.getMine(); // Assuming this works or throws

                if (nutrition && nutrition.plan) {
                    // Render real plan if structure exists (placeholder logic as we don't know schema yet)
                    nutritionContainer.innerHTML = `
                        <div class="nutrition-plan">
                            <h3>${nutrition.plan.name || 'Tu Plan Nutricional'}</h3>
                            <p>${nutrition.plan.description || 'Detalles de tu alimentación.'}</p>
                            <!-- Placeholder for meals -->
                            <div class="empty-state">
                                <i class="fa-solid fa-utensils"></i>
                                <p>Plan cargado. (Visualización detallada en desarrollo)</p>
                            </div>
                        </div>
                     `;
                } else {
                    throw new Error('No nutrition plan found');
                }
            } catch (err) {
                // Fallback content
                nutritionContainer.innerHTML = `
                    <div class="info-card">
                        <i class="fa-solid fa-carrot"></i>
                        <h3>Plan Nutricional Estándar</h3>
                        <p>Para maximizar tus resultados, te recomendamos seguir estas pautas generales:</p>
                        <ul style="text-align: left; margin-top: 1rem; list-style-type: disc; padding-left: 20px;">
                            <li>Mantén una hidratación constante (min. 2L de agua al día).</li>
                            <li>Prioriza proteínas en cada comida (pollo, pescado, huevos, legumbres).</li>
                            <li>Consume carbohidratos complejos antes de entrenar (avena, arroz integral, frutas).</li>
                            <li>Aumenta el consumo de vegetales en almuerzo y cena.</li>
                            <li>Evita azúcares procesados y alcohol.</li>
                        </ul>
                        <p style="margin-top: 1rem; font-size: 0.9em; color: #888;">* Para un plan personalizado, consulta con nuestro nutricionista.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading nutrition content:', error);
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

    // Get today's day
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayName = days[new Date().getDay()];

    const todayRoutine = routine.days.find(d => d.day === todayName);

    let contentHtml = `
        <div class="routine-header">
            <h3>${routine.name}</h3>
            <span class="routine-goal">${goalNames[routine.goal] || routine.goal}</span>
        </div>
    `;

    if (todayRoutine) {
        contentHtml += `
            <div class="routine-day active-day-card">
                <div class="day-header">
                    <h4>Rutina de Hoy: ${capitalizeFirst(todayRoutine.day)}</h4>
                    <span class="muscle-group">${todayRoutine.muscleGroup}</span>
                </div>
                <div class="exercises-list">
                    ${todayRoutine.exercises.map((ex, index) => {
            const uniqueId = `ex-${todayName}-${index}`;
            const isChecked = localStorage.getItem(uniqueId) === 'true';
            return `
                        <div class="exercise-item">
                            <label class="exercise-checkbox-wrapper">
                                <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''} onchange="toggleExercise('${uniqueId}')">
                                <span class="checkmark-round"></span>
                            </label>
                            <div class="exercise-details">
                                <span class="exercise-name">${ex.name}</span>
                                <div class="exercise-meta">
                                    <span class="tag sets">${ex.sets} Series</span>
                                    <span class="tag reps">${ex.reps} Reps</span>
                                    ${ex.weight ? `<span class="tag weight">${ex.weight}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    } else {
        contentHtml += `
            <div class="routine-rest-day">
                <i class="fa-solid fa-mug-hot"></i>
                <h3>¡Día de Descanso!</h3>
                <p>Hoy no tienes entrenamiento programado. Recuperate y come bien.</p>
                <div class="rest-day-actions">
                     <p class="text-muted">Consulta tu plan completo para ver qué sigue.</p>
                </div>
            </div>
        `;
    }

    // Check if new day to clear old checks (simple check)
    const lastLoginDate = localStorage.getItem('lastRoutineDate');
    const todayDateStr = new Date().toDateString();
    if (lastLoginDate !== todayDateStr) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ex-')) localStorage.removeItem(key);
        });
        localStorage.setItem('lastRoutineDate', todayDateStr);
    }

    return contentHtml;
}

window.toggleExercise = function (id) {
    const checkbox = document.getElementById(id);
    localStorage.setItem(id, checkbox.checked);
}

// Setup Timer
let timerInterval;
let seconds = 0;
let isTimerRunning = false;

function setupTimer() {
    const display = document.getElementById('workoutTimer');
    const startBtn = document.getElementById('startTimerBtn');
    const stopBtn = document.getElementById('stopTimerBtn');
    const resetBtn = document.getElementById('resetTimerBtn');

    if (!display) return;

    startBtn.addEventListener('click', () => {
        if (isTimerRunning) return;
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            seconds++;
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            display.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);
        startBtn.classList.add('active');
        stopBtn.classList.remove('active');
    });

    stopBtn.addEventListener('click', () => {
        isTimerRunning = false;
        clearInterval(timerInterval);
        startBtn.classList.remove('active');
        stopBtn.classList.add('active');
    });

    resetBtn.addEventListener('click', () => {
        isTimerRunning = false;
        clearInterval(timerInterval);
        seconds = 0;
        display.textContent = "00:00:00";
        startBtn.classList.remove('active');
        stopBtn.classList.remove('active');
    });
}


// Setup Profile Form
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const avatarInput = document.getElementById('profileAvatarInput');
    const errorDiv = document.getElementById('profileError');
    const objectivesCheckboxes = document.querySelectorAll('input[name="objectives"]');

    if (!form) return;

    // Limit objectives selection to 3
    objectivesCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('input[name="objectives"]:checked').length;
            if (checkedCount > 3) {
                checkbox.checked = false;
                alert('Solo puedes seleccionar hasta 3 objetivos.');
            }
        });
    });

    // Handle avatar upload
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            await authAPI.updateProfile(formData);
            loadUserData();
            const btn = document.querySelector('.avatar-edit-overlay');
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Error al subir la imagen: ' + error.message);
        }
    });

    // Handle profile update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = document.getElementById('profilePhone').value;
        const address = document.getElementById('profileAddress').value;
        const height = document.getElementById('profileHeight').value;
        const weight = document.getElementById('profileWeight').value;
        const gender = document.getElementById('profileGender').value;
        const birthDate = document.getElementById('profileBirthDate').value;
        const initialWeight = document.getElementById('profileInitialWeight').value;

        // Get selected objectives
        const selectedObjectives = Array.from(document.querySelectorAll('input[name="objectives"]:checked'))
            .map(cb => cb.value);

        try {
            const updatePayload = {
                phone,
                address,
                height: height ? Number(height) : null,
                weight: weight ? Number(weight) : null,
                gender: gender || null,
                birthDate: birthDate || null,
                initialWeight: initialWeight ? Number(initialWeight) : null,
                objectives: selectedObjectives
            };

            await authAPI.updateProfile(updatePayload);

            // Show success message
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
            btn.classList.add('btn-success');
            errorDiv.style.display = 'none';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
            }, 3000);

            // Reload user data
            loadUserData();

        } catch (error) {
            console.error('Error updating profile:', error);
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}

let currentDate = new Date();

function setupCalendar() {
    renderCalendar();

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    const monthDisplay = document.getElementById('currentMonth');

    if (!daysContainer || !monthDisplay) return;

    daysContainer.innerHTML = '';

    // Set Month Year text
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthDisplay.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Get first day and days in month
    const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Previous month empty days (padding)
    // Adjusting for Monday start if needed? HTML says Dom=0
    // Standard JS getDay(): 0=Sun, 1=Mon...

    for (let i = 0; i < firstDayIndex; i++) {
        const div = document.createElement('div');
        div.classList.add('day', 'empty');
        daysContainer.appendChild(div);
    }

    // Days of month
    const today = new Date();

    for (let i = 1; i <= lastDay; i++) {
        const div = document.createElement('div');
        div.classList.add('day');
        div.textContent = i;

        // Check if today
        if (i === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()) {
            div.classList.add('current');
        }

        // Add click event for booking
        div.addEventListener('click', () => {
            // Remove active class from others
            document.querySelectorAll('.calendar-days .day').forEach(d => d.classList.remove('active'));
            div.classList.add('active');

            // Format date YYYY-MM-DD
            const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            openBookingModal(selectedDate);
        });

        daysContainer.appendChild(div);
    }
}

function openBookingModal(date) {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.add('active');
        // Populate date input
        const dateInput = document.getElementById('bookingDate');
        if (dateInput) {
            dateInput.value = date.toISOString().split('T')[0];
        }
        // Load available slots...
        loadAvailableSlots(date);
    }
}

// Close modal handlers
document.getElementById('closeBookingModal')?.addEventListener('click', () => {
    document.getElementById('bookingModal')?.classList.remove('active');
});

// Load available slots logic (placeholder for now)
async function loadAvailableSlots(date) {
    const timeSelect = document.getElementById('bookingTime');
    if (!timeSelect) return;

    timeSelect.innerHTML = '<option>Cargando...</option>';

    // Fetch slots from API (mockup or real)
    // For now, generate some generic slots
    const slots = ['08:00', '09:00', '10:00', '11:00', '16:00', '17:00', '18:00', '19:00'];

    timeSelect.innerHTML = '<option value="">Selecciona un horario</option>' +
        slots.map(t => `<option value="${t}">${t}</option>`).join('');
}

function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Render Body Stats (BFI, Weight Progress)
function renderBodyStats(user) {
    const bfiDisplay = document.getElementById('overviewBFI');
    const initialWeightDisplay = document.getElementById('overviewInitialWeight');
    const currentWeightDisplay = document.getElementById('overviewCurrentWeight');

    if (!bfiDisplay) return;

    // Weight Progress
    initialWeightDisplay.textContent = user.initialWeight ? `${user.initialWeight} kg` : '-- kg';
    // ... (previous content)
}

// Handle Booking Form Submission
document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    const errorDiv = document.getElementById('bookingError');
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const date = document.getElementById('bookingDate').value;
        const startTime = document.getElementById('bookingTime').value;
        const duration = document.getElementById('bookingDuration').value;

        if (!date || !startTime) {
            throw new Error('Por favor selecciona fecha y hora.');
        }

        // Calculate endTime
        const [startHour, startMin] = startTime.split(':').map(Number);
        const totalMinutes = parseInt(duration);
        const endDate = new Date();
        endDate.setHours(startHour, startMin + totalMinutes);
        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        await bookingsAPI.create({
            date,
            startTime,
            endTime
        });

        // Close modal and show success (alert for now or custom toast)
        document.getElementById('bookingModal').classList.remove('active');
        alert('Reserva confirmada con éxito');

        // Reload bookings list
        loadBookings();
        loadOverviewData(); // Update overview card

    } catch (error) {
        console.error('Booking error:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Error al crear la reserva';
            errorDiv.style.display = 'block';
        }
    }
});

// Load User Bookings
window.loadBookings = async function () {
    const listContainer = document.getElementById('bookingsList');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i><p>Cargando reservas...</p></div>';

    try {
        const bookings = await bookingsAPI.getMine(); // Assuming getMine exists based on other APIs

        if (bookings && bookings.length > 0) {
            listContainer.innerHTML = bookings.map(booking => `
                <div class="booking-item">
                    <div class="booking-date">
                        <span class="day">${new Date(booking.date).getDate()}</span>
                        <span class="month">${new Date(booking.date).toLocaleString('es', { month: 'short' }).toUpperCase()}</span>
                    </div>
                    <div class="booking-info">
                        <h4>Entrenamiento</h4>
                        <p><i class="fa-regular fa-clock"></i> ${booking.startTime} - ${booking.endTime}</p>
                    </div>
                    <div class="booking-status ${booking.status}">
                        ${booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </div>
                    ${booking.status !== 'cancelled' ? `
                    <button class="btn-icon delete-booking" onclick="cancelBooking('${booking._id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>` : ''}
                </div>
            `).join('');
        } else {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <h3>No tienes reservas activas</h3>
                    <p>¡Agenda tu próximo entrenamiento ahora!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        listContainer.innerHTML = '<p class="error-text">Error al cargar reservas.</p>';
    }
};

window.cancelBooking = async function (id) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
        await bookingsAPI.cancel(id); // Check API for cancel method
        loadBookings();
        loadOverviewData();
    } catch (error) {
        alert('Error al cancelar reserva');
    }
};
currentWeightDisplay.textContent = user.weight ? `${user.weight} kg` : '-- kg';

// Body Fat Calculation (Deurenberg Formula)
// Body Fat % = (1.20 × BMI) + (0.23 × Age) - (10.8 × Sex) - 5.4
// Sex: 1 for male, 0 for female
if (user.height && user.weight && user.birthDate && user.gender) {
    const heightM = user.height / 100;
    const bmi = user.weight / (heightM * heightM);

    const birthDate = new Date(user.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    const sexValue = user.gender === 'male' ? 1 : 0;
    const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * sexValue) - 5.4;

    bfiDisplay.textContent = `${bodyFat.toFixed(1)} %`;
} else {
    bfiDisplay.textContent = '-- %';
}


// Load Plan Details for "Mi Plan" section
async function loadPlanDetails() {
    const container = document.getElementById('planContent');
    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando información del plan...</p>
        </div>
    `;

    try {
        const res = await subscriptionsAPI.getMine();
        // Handle backend structure { hasSubscription: true, subscription: {...} }
        const sub = res.subscription || res;

        if (sub && sub.plan) {
            const plan = sub.plan;
            const startDate = new Date(sub.startDate).toLocaleDateString();
            const endDate = new Date(sub.endDate).toLocaleDateString();
            const statusClass = (sub.status === 'al_dia' || sub.status === 'active') ? 'active' : (sub.status === 'pendiente' ? 'pending' : 'expired');
            const statusText = (sub.status === 'al_dia' || sub.status === 'active') ? 'Al día' : (sub.status === 'pendiente' ? 'Pendiente' : 'Suspendido');

            container.innerHTML = `
                <div class="stat-card" style="display: block; width: 100%; max-width: 800px; margin: 0 auto; background: rgba(30, 41, 59, 0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div style="display: flex; gap: 1.5rem; align-items: center;">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white;">
                                <i class="fa-solid fa-crown"></i>
                            </div>
                            <div>
                                <h3 style="font-size: 1.5rem; color: white; margin-bottom: 0.5rem;">${plan.displayName || plan.name}</h3>
                                <p style="color: #94a3b8;">${plan.description || ''}</p>
                            </div>
                        </div>
                        <span class="status-badge status-${statusClass}" style="font-size: 1rem; padding: 0.5rem 1rem;">
                            ${statusText}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">Precio</label>
                            <span style="color: white; font-weight: 600; font-size: 1.125rem;">$${plan.price} / mes</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">Inicio</label>
                            <span style="color: white; font-weight: 600; font-size: 1.125rem;">${startDate}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">Vencimiento</label>
                            <span style="color: white; font-weight: 600; font-size: 1.125rem;">${endDate}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">Renovación</label>
                            <span style="color: white; font-weight: 600; font-size: 1.125rem;">Automática</span>
                        </div>
                    </div>

                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem;">
                        <h4 style="color: white; margin-bottom: 1rem;">Incluye:</h4>
                        <ul style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; list-style: none; padding: 0;">
                            ${(plan.features || ['Acceso completo', 'Duchas', 'Lockers']).map(f => `
                                <li style="color: #cbd5e1; display: flex; align-items: center; gap: 0.75rem;">
                                    <i class="fa-solid fa-check" style="color: #10b981;"></i> ${f}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-crown"></i>
                    <h3>No tienes un plan activo</h3>
                    <p>Contacta a administración para suscribirte.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading plan details:', error);
        container.innerHTML = `<p class="error-text">Error al cargar el plan.</p>`;
    }
}

// Placeholder functions for other sections
window.loadNutritionDetails = async function () {
    console.log('Loading nutrition details...');
    // Implemented via Overview for now
};

window.loadBookings = async function () {
    // Already handled by initial load
};

// Ensure global scope
window.loadPlanDetails = loadPlanDetails;
