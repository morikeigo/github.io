document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const showTab = (name) => {
        tabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === name);
        });

        tabContents.forEach((content) => {
            content.classList.toggle('active', content.id === `tab-${name}`);
        });
    };

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => showTab(button.dataset.tab));
    });

    document.querySelectorAll('header nav a[href^="#"]').forEach((link) => {
        link.addEventListener('click', () => showTab('overview'));
    });

    showTab('overview');

    const ctx = document.getElementById('normalDistributionChart');
    if (!ctx) {
        return;
    }

    const meanInput = document.getElementById('meanInput');
    const stdDevInput = document.getElementById('stdDevInput');
    const meanValueDisplay = document.getElementById('meanValue');
    const stdDevValueDisplay = document.getElementById('stdDevValue');

    if (!meanInput || !stdDevInput || !meanValueDisplay || !stdDevValueDisplay) {
        return;
    }

    const formatValue = (value) => Number(value).toFixed(2);

    const sanitizeParameters = () => {
        let mean = parseFloat(meanInput.value);
        if (!Number.isFinite(mean)) {
            mean = 0;
        }
        mean = Number(mean.toFixed(1));

        let stdDev = parseFloat(stdDevInput.value);
        const minStdDev = parseFloat(stdDevInput.min) || 0.1;
        if (!Number.isFinite(stdDev) || stdDev <= 0) {
            stdDev = minStdDev;
        } else if (stdDev < minStdDev) {
            stdDev = minStdDev;
        }
        stdDev = Number(stdDev.toFixed(1));

        meanInput.value = mean.toFixed(1);
        stdDevInput.value = stdDev.toFixed(1);

        meanValueDisplay.textContent = formatValue(mean);
        stdDevValueDisplay.textContent = formatValue(stdDev);

        return { mean, stdDev };
    };

    const generateNormalDistribution = (mean, stdDev) => {
        const data = [];
        const min = mean - 4 * stdDev;
        const max = mean + 4 * stdDev;

        for (let z = -4; z <= 4.000001; z += 0.1) {
            const x = mean + z * stdDev;
            const exponent = -0.5 * z * z;
            const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            data.push({ x, y: density });
        }

        return { data, min, max };
    };

    const { mean: initialMean, stdDev: initialStdDev } = sanitizeParameters();
    const {
        data: initialData,
        min: initialMin,
        max: initialMax,
    } = generateNormalDistribution(initialMean, initialStdDev);

    const normalChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Normal Distribution (μ = ${formatValue(initialMean)}, σ = ${formatValue(initialStdDev)})`,
                    data: initialData,
                    borderColor: 'rgba(106, 156, 245, 1)',
                    backgroundColor: 'rgba(138, 182, 255, 0.25)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.35,
                    parsing: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `x = ${context.parsed.x.toFixed(2)}, f(x) = ${context.parsed.y.toFixed(4)}`,
                    },
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Value',
                    },
                    ticks: {
                        maxTicksLimit: 9,
                        callback: (value) => Number(value).toFixed(1),
                    },
                    min: initialMin,
                    max: initialMax,
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability Density',
                    },
                    beginAtZero: true,
                },
            },
        },
    });

    const updateChart = () => {
        const { mean, stdDev } = sanitizeParameters();
        const { data, min, max } = generateNormalDistribution(mean, stdDev);

        normalChart.data.datasets[0].data = data;
        normalChart.data.datasets[0].label = `Normal Distribution (μ = ${formatValue(mean)}, σ = ${formatValue(stdDev)})`;
        normalChart.options.scales.x.min = min;
        normalChart.options.scales.x.max = max;
        normalChart.update();
    };

    meanInput.addEventListener('input', updateChart);
    stdDevInput.addEventListener('input', updateChart);
});
    
