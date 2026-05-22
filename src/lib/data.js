import { toNumber } from './format.js';

export function getStationPriceAverage(stations) {
  const values = (stations || []).map((station) => toNumber(station.price)).filter((value) => value !== null);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getLatestSnapshot(historyPayload) {
  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  return snapshots.at(-1) || null;
}

export function getPreviousSnapshot(historyPayload) {
  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  return snapshots.length >= 2 ? snapshots.at(-2) : null;
}

export function findMetric(snapshot, regionCode, fuelCode) {
  return (snapshot?.metrics || []).find((metric) => metric.regionCode === regionCode && metric.fuelCode === fuelCode) || null;
}


export function getStationKey(station) {
  if (!station) return '';
  return String(station.id || station.stationId || station.uniId || `${station.name || 'station'}-${station.roadAddress || station.address || station.brand || ''}`);
}
