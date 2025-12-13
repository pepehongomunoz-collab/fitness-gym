// Render Body Stats (BFI, Weight Progress)
function renderBodyStats(user) {
    const bfiDisplay = document.getElementById('overviewBFI');
    const initialWeightDisplay = document.getElementById('overviewInitialWeight');
    const currentWeightDisplay = document.getElementById('overviewCurrentWeight');

    // Weight Progress
    if (user.initialWeight) {
        initialWeightDisplay.textContent = `${user.initialWeight} kg`;
    } else {
        initialWeightDisplay.textContent = '-- kg';
    }

    if (user.weight) {
        currentWeightDisplay.textContent = `${user.weight} kg`;
    } else {
        currentWeightDisplay.textContent = '-- kg';
    }

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
}
