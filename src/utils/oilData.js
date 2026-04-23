export function uniqueOptions(datasets, codeKey, nameKey) {
  const seen = new Set();
  const options = [];
  datasets.forEach((item) => {
    const code = item?.[codeKey];
    if (!code || seen.has(code)) return;
    seen.add(code);
    options.push({ code, name: item?.[nameKey] || code });
  });
  return options;
}

export function sortStationsByPrice(stations = []) {
  return [...stations].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
}

export function getPriceStats(stations = []) {
  const prices = stations.map((station) => Number(station.price)).filter((price) => Number.isFinite(price) && price > 0);
  const lowest = stations[0] ?? null;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
  return { lowest, average };
}
