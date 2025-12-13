
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
            const statusClass = sub.status === 'al_dia' ? 'active' : (sub.status === 'pendiente' ? 'pending' : 'expired');
            const statusText = sub.status === 'al_dia' ? 'Al día' : (sub.status === 'pendiente' ? 'Pendiente' : 'Suspendido');

            container.innerHTML = `
                <div class="plan-details-card">
                    <div class="plan-header-large">
                        <div class="plan-icon-large">
                            <i class="fa-solid fa-crown"></i>
                        </div>
                        <div class="plan-title-info">
                            <h3>${plan.displayName || plan.name}</h3>
                            <span class="plan-subtitle">${plan.description || ''}</span>
                        </div>
                        <div class="plan-status-large ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                    
                    <div class="plan-info-grid">
                        <div class="info-item">
                            <label>Precio</label>
                            <span>$${plan.price} / mes</span>
                        </div>
                        <div class="info-item">
                            <label>Inicio</label>
                            <span>${startDate}</span>
                        </div>
                        <div class="info-item">
                            <label>Vencimiento</label>
                            <span>${endDate}</span>
                        </div>
                        <div class="info-item">
                            <label>Renovación</label>
                            <span>Automática</span>
                        </div>
                    </div>

                    <div class="plan-features-list">
                        <h4>Incluye:</h4>
                        <ul>
                            ${(plan.features || []).map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('')}
                            ${(!plan.features || plan.features.length === 0) ? '<li>Acceso completo al gimnasio</li><li>Uso de duchas y vestuarios</li>' : ''}
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

// Ensure global scope
window.loadPlanDetails = loadPlanDetails;
