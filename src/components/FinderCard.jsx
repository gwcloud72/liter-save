import { formatDate, formatWon } from '../utils/format.js';

const WAITING_TEXT = '데이터연동대기';

export default function FinderCard({
  fuelOptions,
  regionOptions,
  selectedFuel,
  selectedRegion,
  onFuelChange,
  onRegionChange,
  onRefresh,
  lowestStation,
  averagePrice,
  mode,
  generatedAt,
  isLoading,
}) {
  const hasFuelOptions = fuelOptions.length > 0;
  const hasRegionOptions = regionOptions.length > 0;
  const isReady = mode === 'opinet' && hasFuelOptions && hasRegionOptions;
  const dataLabel = isReady ? '연동완료' : WAITING_TEXT;
  const dataUpdatedLabel = generatedAt ? `갱신: ${formatDate(generatedAt)}` : WAITING_TEXT;

  return (
    <section id="finder" className="finder-card" aria-label="최저가 주유소 검색">
      <div className="finder-card__head">
        <div>
          <h2>최저가 주유소 찾기</h2>
          <p>유종과 지역을 고르면 목록이 바로 갱신됩니다.</p>
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

      <div className="summary-grid" aria-label="요약 정보">
        <article className="summary-card">
          <span className="summary-card__label">최저가</span>
          <strong>{lowestStation ? formatWon(lowestStation.price) : WAITING_TEXT}</strong>
          <small>{lowestStation ? lowestStation.name : WAITING_TEXT}</small>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">목록 평균</span>
          <strong>{averagePrice ? formatWon(averagePrice) : WAITING_TEXT}</strong>
          <small>표시된 주유소 기준</small>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">데이터</span>
          <strong>{dataLabel}</strong>
          <small>{dataUpdatedLabel}</small>
        </article>
      </div>
    </section>
  );
}
