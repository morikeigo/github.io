document.addEventListener('DOMContentLoaded', () => {
    const RATE_PAIRS = [
        { base: 'USD', symbol: 'JPY' },
        { base: 'EUR', symbol: 'JPY' },
    ];
    const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

    const ratesBody = document.getElementById('ratesBody');
    const dataDateElement = document.getElementById('ratesDataDate');
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const statusElement = document.getElementById('statusMessage');
    const refreshButton = document.getElementById('refreshRatesButton');

    if (!ratesBody || !lastUpdatedElement || !statusElement) {
        return;
    }

    const numberFormatter = new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
    const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeZone: 'Asia/Tokyo',
    });
    const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Tokyo',
    });

    const formatRate = (rate) => numberFormatter.format(rate);
    const formatDate = (dateString) => {
        const date = new Date(`${dateString}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) {
            return dateString;
        }
        return dateFormatter.format(date);
    };
    const formatDateTime = (date) => dateTimeFormatter.format(date);

    const fetchPair = async ({ base, symbol }) => {
        const url = `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbol}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Frankfurter API responded with status ${response.status}`);
        }

        const payload = await response.json();
        const rate = payload?.rates?.[symbol];

        if (typeof rate !== 'number') {
            throw new Error('Frankfurter API response did not include the expected rate.');
        }

        return {
            base,
            symbol,
            rate,
            date: payload.date,
        };
    };

    const renderFallbackRows = () => {
        ratesBody.innerHTML = '';
        RATE_PAIRS.forEach(({ base, symbol }) => {
            const row = document.createElement('tr');
            row.classList.add('rates-row-error');

            const pairCell = document.createElement('th');
            pairCell.scope = 'row';
            pairCell.textContent = `${base} / ${symbol}`;

            const rateCell = document.createElement('td');
            rateCell.textContent = '取得エラー';

            const dateCell = document.createElement('td');
            dateCell.textContent = '—';

            row.append(pairCell, rateCell, dateCell);
            ratesBody.appendChild(row);
        });
    };

    let isUpdating = false;

    const refreshRates = async () => {
        if (isUpdating) {
            return;
        }

        isUpdating = true;
        statusElement.textContent = '最新のレートを取得しています...';

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        const fetchTime = new Date();

        try {
            const results = await Promise.allSettled(RATE_PAIRS.map(fetchPair));

            ratesBody.innerHTML = '';

            let successCount = 0;
            let failureCount = 0;
            let latestDataDate = null;

            results.forEach((result, index) => {
                const { base, symbol } = RATE_PAIRS[index];
                const row = document.createElement('tr');

                const pairCell = document.createElement('th');
                pairCell.scope = 'row';
                pairCell.textContent = `${base} / ${symbol}`;
                row.appendChild(pairCell);

                const rateCell = document.createElement('td');
                const dateCell = document.createElement('td');

                if (result.status === 'fulfilled') {
                    const { rate, date } = result.value;

                    rateCell.textContent = formatRate(rate);
                    dateCell.textContent = formatDate(date);

                    if (!latestDataDate || date > latestDataDate) {
                        latestDataDate = date;
                    }

                    successCount += 1;
                } else {
                    rateCell.textContent = '取得エラー';
                    dateCell.textContent = '—';
                    row.classList.add('rates-row-error');
                    failureCount += 1;
                    console.error(`Failed to fetch rate for ${base}/${symbol}`, result.reason);
                }

                row.append(rateCell, dateCell);
                ratesBody.appendChild(row);
            });

            if (dataDateElement) {
                dataDateElement.textContent = latestDataDate ? formatDate(latestDataDate) : '—';
            }

            lastUpdatedElement.textContent =
                successCount > 0 ? formatDateTime(fetchTime) : '—';

            if (failureCount === 0) {
                statusElement.textContent = '最新のレートを取得しました。';
            } else if (successCount === 0) {
                statusElement.textContent = 'レートを取得できませんでした。時間をおいて再度お試しください。';
            } else {
                statusElement.textContent = '一部のレートを取得できませんでした。';
            }
        } catch (error) {
            console.error('Unexpected error while updating rates', error);
            renderFallbackRows();
            lastUpdatedElement.textContent = '—';
            if (dataDateElement) {
                dataDateElement.textContent = '—';
            }
            statusElement.textContent = 'レートを取得できませんでした。時間をおいて再度お試しください。';
        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
            }
            isUpdating = false;
        }
    };

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshRates();
        });
    }

    refreshRates();
    setInterval(refreshRates, REFRESH_INTERVAL_MS);
});
