import { formatDate, formatDistanceKm, formatWon } from '../utils/format.js';
import { SORT_MODE_LABELS } from '../utils/oilData.js';

const WAITING_TEXT = '데이터연동대기';

function getLocationHelperText({ isLocationReady, locationStatus, locationError }) {
  if (locationStatus === 'loading') return '현재 위치를 확인하는 중입니다.';
  if (locationStatus === 'error') return locationError || '현재 위치를 확인할 수 없습니다.';
  if (isLocationReady) return '현재 위치 기준 거리와 가성비 추천을 표시 중입니다.';
  return '가까운 순과 가성비 추천은 조회된 주유소 기준으로 계산됩니다.';
}

function getLocationButtonLabel({ isLocationReady, locationStatus }) {
  if (locationStatus === 'loading') return '위치 확인 중';
  if (isLocationReady) return '내 위치 다시 찾기';
  return '내 위치 사용';
}

function getValueSummary(bestValueStation) {
  if (!bestValueStation) return WAITING_TEXT;

  if (Number(bestValueStation.expectedSavings40L) > 0) {
    return `약 ${formatWon(bestValueStation.expectedSavings40L)} 절약`;
  }

  if (Number.isFinite(Number(bestValueStation.distanceKm))) {
    return formatDistanceKm(bestValueStation.distanceKm);
  }

  return formatWon(bestValueStation.price);
}

export default function FinderCard({
  fuelOptions,
  regionOptions,
  selectedFuel,
  selectedRegion,
  onFuelChange,
  onRegionChange,
  onRefresh,
  lowestStation,
  nearestStation,
  bestValueStation,
  mode,
  generatedAt,
  totalStationCount,
  isLoading,
  sortMode,
  onSortChange,
  onUseLocation,
  isLocationReady,
  locationStatus,
  locationError,
  onCopyShareLink,
  shareMessage,
  favoritesOnly,
  onToggleFavoritesOnly,
  favoriteCount,
}) {
  const hasFuelOptions = fuelOptions.length > 0;
  const hasRegionOptions = regionOptions.length > 0;
  const isReady = mode === 'opinet' && hasFuelOptions && hasRegionOptions && totalStationCount > 0;
  const dataLabel = isReady ? '데이터 연동 완료' : WAITING_TEXT;
  const dataUpdatedLabel = generatedAt ? `갱신: ${formatDate(generatedAt)}` : WAITING_TEXT;
  const locationHelperText = getLocationHelperText({ isLocationReady, locationStatus, locationError });
  const locationButtonLabel = getLocationButtonLabel({ isLocationReady, locationStatus });

  return (
    <section id="finder" className="finder-card" aria-label="최저가 주유소 검색">
      <div className="finder-card__head">
        <div>
          <h2>최저가 주유소 찾기</h2>
          <p>유종, 지역, 정렬 방식을 바꾸면 목록과 차트가 함께 갱신됩니다.</p>
        </div>
        <button id="refreshButton" type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? '불러오는 중' : '데이터 새로고침'}
        </button>
      </div>

      <div className="filters" aria-label="검색 조건">
        <label>
          <span>유종</span>
          <select value={selectedFuel} onChange={(event) => onFuelChange(event.target.value)} disabled={!hasFuelOptions}>
            {!hasFuelOptions && <option value="">{WAITING_TEXT}</option>}
            {fuelOptions.map((fuel) => <option key={fuel.code} value={fuel.code}>{fuel.name}</option>)}
          </select>
        </label>
        <label>
          <span>지역</span>
          <select value={selectedRegion} onChange={(event) => onRegionChange(event.target.value)} disabled={!hasRegionOptions}>
            {!hasRegionOptions && <option value="">{WAITING_TEXT}</option>}
            {regionOptions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
          </select>
        </label>
      </div>

      <div className="location-panel" aria-label="현재 위치 설정">
        <div>
          <strong>현재 위치 기준 비교</strong>
          <p className={`location-panel__hint${locationStatus === 'error' ? ' is-error' : ''}`}>{locationHelperText}</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onUseLocation()}
          disabled={locationStatus === 'loading'}
        >
          {locationButtonLabel}
        </button>
      </div>

      <div className="sort-mode" role="toolbar" aria-label="정렬 방식">
        {Object.entries(SORT_MODE_LABELS).map(([code, label]) => (
          <button
            key={code}
            type="button"
            className={`sort-chip${sortMode === code ? ' is-active' : ''}`}
            onClick={() => onSortChange(code)}
            disabled={locationStatus === 'loading'}
            aria-pressed={sortMode === code}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="summary-grid" aria-label="요약 정보">
        <article className="summary-card">
          <span className="summary-card__label">최저가</span>
          <strong>{lowestStation ? formatWon(lowestStation.price) : WAITING_TEXT}</strong>
          <small>{lowestStation ? lowestStation.name : WAITING_TEXT}</small>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">가까운 곳</span>
          <strong>{nearestStation ? formatDistanceKm(nearestStation.distanceKm) : WAITING_TEXT}</strong>
          <small>{nearestStation ? nearestStation.name : WAITING_TEXT}</small>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">가성비 추천</span>
          <strong>{getValueSummary(bestValueStation)}</strong>
          <small>
            {bestValueStation
              ? `${bestValueStation.name}${bestValueStation.distanceKm ? ` · ${formatDistanceKm(bestValueStation.distanceKm)}` : ''}`
              : WAITING_TEXT}
          </small>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">데이터</span>
          <strong>{dataLabel}</strong>
          <small>{dataUpdatedLabel}</small>
        </article>
      </div>

      <div className="utility-panel" aria-label="공유 및 즐겨찾기">
        <div className="utility-panel__copy">
          <strong>공유와 즐겨찾기</strong>
          <p>현재 화면 링크를 복사하거나, 자주 보는 주유소만 따로 모아볼 수 있습니다.</p>
          <div className="utility-panel__meta">
            <span className="sort-label">현재 조건 즐겨찾기 {favoriteCount}곳</span>
            <span className="sort-label">현재 위치는 링크에 포함되지 않습니다.</span>
          </div>
          {shareMessage && <p className="utility-panel__message">{shareMessage}</p>}
        </div>
        <div className="utility-panel__actions">
          <button type="button" className="secondary-button" onClick={onCopyShareLink}>현재 화면 공유</button>
          <button
            type="button"
            className={`secondary-button${favoritesOnly ? ' is-active' : ''}`}
            onClick={onToggleFavoritesOnly}
            aria-pressed={favoritesOnly}
          >
            {favoritesOnly ? '전체 목록 보기' : '즐겨찾기만 보기'}
          </button>
        </div>
      </div>
    </section>
  );
}
