import StationCard from './StationCard.jsx';

const WAITING_TEXT = '데이터연동대기';

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

export default function StationList({
  dataset,
  stations,
  totalStations,
  averagePrice,
  status,
  errorMessage,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}) {
  const caption = dataset ? `${dataset.regionName} · ${dataset.fuelName} · 총 ${totalStations}개` : WAITING_TEXT;
  const startNumber = totalStations > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endNumber = totalStations > 0 ? Math.min(currentPage * pageSize, totalStations) : 0;
  const pageNumbers = getVisiblePages(currentPage, totalPages);

  return (
    <section className="list-section" aria-labelledby="list-title">
      <div className="section-heading">
        <div>
          <h2 id="list-title">최저가 목록</h2>
          <p>{status === 'loading' ? '데이터를 불러오는 중입니다.' : caption}</p>
        </div>
        <div className="section-meta" aria-label="정렬 및 표시 정보">
          <span className="sort-label">가격 낮은 순</span>
          {status === 'success' && totalStations > 0 && <span className="sort-label">페이지당 {pageSize}개</span>}
        </div>
      </div>

      <div className="station-list" aria-live="polite">
        {status === 'loading' && <div className="empty-state">데이터를 불러오는 중입니다.</div>}
        {status === 'error' && <div className="empty-state">{errorMessage || WAITING_TEXT}</div>}
        {status === 'success' && totalStations === 0 && <div className="empty-state">{WAITING_TEXT}</div>}
        {status === 'success' && stations.map((station, index) => (
          <StationCard
            key={station.id || `${station.name}-${startNumber + index}`}
            station={station}
            rank={startNumber + index}
            averagePrice={averagePrice}
          />
        ))}
      </div>

      {status === 'success' && totalStations > 0 && totalPages > 1 && (
        <nav className="pagination" aria-label="페이지 이동">
          <p className="pagination__summary">
            {startNumber} - {endNumber} / {totalStations}
          </p>
          <div className="pagination__controls">
            <button
              type="button"
              className="pagination__button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              이전
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                className={`pagination__button${page === currentPage ? ' is-active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="pagination__button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
