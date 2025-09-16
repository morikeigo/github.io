const API_BASE_URL = 'https://api.frankfurter.dev/v1';

const RATE_PAIRS = [
    { base: 'USD', symbol: 'JPY' },
    { base: 'EUR', symbol: 'JPY' },
];
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const HISTORICAL_DAYS = 14;
const HISTORICAL_LOOKBACK_BUFFER_DAYS = 7;

const initializedTargets = new WeakMap();

const isElement = (value) => value?.nodeType === 1;
const isDocumentNode = (value) => value?.nodeType === 9;

const resolveRoot = (target) => {
    if (isElement(target) || isDocumentNode(target)) {
        return target;
    }

    if (target && typeof target === 'object') {
        const { root, container, element } = target;
        if (isElement(root) || isDocumentNode(root)) {
            return root;
        }
        if (isElement(container) || isDocumentNode(container)) {
            return container;
        }
        if (isElement(element) || isDocumentNode(element)) {
            return element;
        }
    }

    return document;
};

const toISODateString = (date) => date.toISOString().split('T')[0];

const fetchPair = async ({ base, symbol }) => {
    const url = `${API_BASE_URL}/latest?base=${base}&symbols=${symbol}`;
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

const fetchHistoricalSeries = async ({ base, symbol }) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(
        startDate.getUTCDate() - (HISTORICAL_DAYS + HISTORICAL_LOOKBACK_BUFFER_DAYS),
    );

    const url = `${API_BASE_URL}/timeseries?start=${toISODateString(
        startDate,
    )}&end=${toISODateString(endDate)}&base=${base}&symbols=${symbol}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Frankfurter timeseries API responded with status ${response.status}`);
    }

    const payload = await response.json();
    const rates = payload?.rates;

    if (!rates || typeof rates !== 'object') {
        throw new Error('Frankfurter API response did not include historical rates.');
    }

    const orderedEntries = Object.entries(rates)
        .map(([date, values]) => {
            const rate = values?.[symbol];
            if (typeof rate !== 'number') {
                return null;
            }

            return { date, rate };
        })
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));

    if (orderedEntries.length === 0) {
        return [];
    }

    const entriesWithChange = orderedEntries.map((entry, index) => {
        const previous = index > 0 ? orderedEntries[index - 1] : null;
        const change =
            previous && typeof previous.rate === 'number' && previous.rate !== 0
                ? (entry.rate - previous.rate) / previous.rate
                : null;

        return {
            ...entry,
            change,
        };
    });

    return entriesWithChange.slice(-HISTORICAL_DAYS);
};

export function initializeExchangeRates(target) {
    const root = resolveRoot(target);

    if (!root || !(isElement(root) || isDocumentNode(root))) {
        console.warn('initializeExchangeRates called without a valid root element.');
        return null;
    }

    if (initializedTargets.has(root)) {
        return initializedTargets.get(root);
    }

    const ratesBody = root.querySelector('#ratesBody');
    const historicalBody = root.querySelector('#historicalRatesBody');
    const dataDateElement = root.querySelector('#ratesDataDate');
    const lastUpdatedElement = root.querySelector('#lastUpdated');
    const statusElement = root.querySelector('#statusMessage');
    const refreshButton = root.querySelector('#refreshRatesButton');

    if (!ratesBody || !historicalBody || !lastUpdatedElement || !statusElement) {
        console.warn('Exchange rates UI elements are missing. Initialization skipped.');
        return null;
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
    const percentFormatter = new Intl.NumberFormat('ja-JP', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
    const formatChangeRate = (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return '—';
        }

        const formatted = percentFormatter.format(value);
        return value > 0 ? `+${formatted}` : formatted;
    };
    const getChangeClassName = (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
            return 'rate-change-neutral';
        }

        return value > 0 ? 'rate-change-positive' : 'rate-change-negative';
    };

    const renderHistoricalPlaceholder = (message) => {
        historicalBody.innerHTML = '';
        const row = document.createElement('tr');
        row.classList.add('rates-empty-row');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = message;
        row.appendChild(cell);
        historicalBody.appendChild(row);
    };

    const renderHistoricalRates = (seriesMap) => {
        if (!historicalBody) {
            return;
        }

        historicalBody.innerHTML = '';

        const dateSet = new Set();
        const entryMaps = new Map();

        RATE_PAIRS.forEach(({ base, symbol }) => {
            const pairKey = `${base}/${symbol}`;
            const entries = seriesMap?.get(pairKey);

            if (Array.isArray(entries) && entries.length > 0) {
                const map = new Map();
                entries.forEach((entry) => {
                    if (entry && entry.date) {
                        map.set(entry.date, entry);
                        dateSet.add(entry.date);
                    }
                });
                entryMaps.set(pairKey, map);
            } else if (Array.isArray(entries)) {
                entryMaps.set(pairKey, new Map());
            }
        });

        const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            renderHistoricalPlaceholder('データがありません。');
            return;
        }

        sortedDates.forEach((date) => {
            const row = document.createElement('tr');

            const dateCell = document.createElement('th');
            dateCell.scope = 'row';
            dateCell.textContent = formatDate(date);
            row.appendChild(dateCell);

            RATE_PAIRS.forEach(({ base, symbol }) => {
                const pairKey = `${base}/${symbol}`;
                const map = entryMaps.get(pairKey);
                const entry = map ? map.get(date) : null;

                const rateCell = document.createElement('td');
                if (entry && typeof entry.rate === 'number' && Number.isFinite(entry.rate)) {
                    rateCell.textContent = formatRate(entry.rate);
                } else {
                    rateCell.textContent = '—';
                }
                row.appendChild(rateCell);

                const changeCell = document.createElement('td');
                changeCell.classList.add('rate-change');
                if (entry && typeof entry.change === 'number' && Number.isFinite(entry.change)) {
                    changeCell.textContent = formatChangeRate(entry.change);
                    changeCell.classList.add(getChangeClassName(entry.change));
                } else {
                    changeCell.textContent = '—';
                    changeCell.classList.add('rate-change-neutral');
                }
                row.appendChild(changeCell);
            });

            historicalBody.appendChild(row);
        });
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
            const [latestResults, historicalResults] = await Promise.all([
                Promise.allSettled(RATE_PAIRS.map(fetchPair)),
                Promise.allSettled(RATE_PAIRS.map(fetchHistoricalSeries)),
            ]);

            ratesBody.innerHTML = '';

            let latestSuccessCount = 0;
            let latestFailureCount = 0;
            let latestDataDate = null;

            latestResults.forEach((result, index) => {
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

                    latestSuccessCount += 1;
                } else {
                    rateCell.textContent = '取得エラー';
                    dateCell.textContent = '—';
                    row.classList.add('rates-row-error');
                    latestFailureCount += 1;
                    console.error(`Failed to fetch rate for ${base}/${symbol}`, result.reason);
                }

                row.append(rateCell, dateCell);
                ratesBody.appendChild(row);
            });

            if (dataDateElement) {
                dataDateElement.textContent = latestDataDate ? formatDate(latestDataDate) : '—';
            }

            lastUpdatedElement.textContent =
                latestSuccessCount > 0 ? formatDateTime(fetchTime) : '—';

            const historicalSeriesMap = new Map();
            let historicalSuccessCount = 0;
            let historicalFailureCount = 0;

            historicalResults.forEach((result, index) => {
                const { base, symbol } = RATE_PAIRS[index];
                const pairKey = `${base}/${symbol}`;

                if (result.status === 'fulfilled') {
                    historicalSuccessCount += 1;
                    const entries = Array.isArray(result.value) ? result.value : [];
                    historicalSeriesMap.set(pairKey, entries);
                } else {
                    historicalFailureCount += 1;
                    console.error(`Failed to fetch historical data for ${pairKey}`, result.reason);
                }
            });

            if (historicalSuccessCount === 0 && historicalFailureCount > 0) {
                renderHistoricalPlaceholder('レートを取得できませんでした。');
            } else {
                renderHistoricalRates(historicalSeriesMap);
            }

            if (latestFailureCount === 0 && historicalFailureCount === 0) {
                statusElement.textContent = '最新のレートと過去2週間のデータを取得しました。';
            } else if (latestSuccessCount === 0 && historicalSuccessCount === 0) {
                statusElement.textContent = 'レートを取得できませんでした。時間をおいて再度お試しください。';
            } else if (latestFailureCount > 0 && historicalFailureCount > 0) {
                statusElement.textContent = '最新と過去の一部データを取得できませんでした。';
            } else if (latestFailureCount > 0) {
                statusElement.textContent = '最新レートの一部を取得できませんでした。';
            } else {
                statusElement.textContent = '過去データの一部を取得できませんでした。';
            }
        } catch (error) {
            console.error('Unexpected error while updating rates', error);
            renderFallbackRows();
            renderHistoricalPlaceholder('レートを取得できませんでした。');
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

    const handleRefreshButtonClick = () => {
        refreshRates();
    };

    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshButtonClick);
    }

    const intervalId = setInterval(refreshRates, REFRESH_INTERVAL_MS);

    refreshRates();

    const destroy = () => {
        if (refreshButton) {
            refreshButton.removeEventListener('click', handleRefreshButtonClick);
        }
        clearInterval(intervalId);
        initializedTargets.delete(root);
    };

    const state = {
        refreshRates,
        destroy,
    };

    initializedTargets.set(root, state);
    return state;
}
