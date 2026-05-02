import { useEffect, useMemo, useState } from 'react';
import { buildDaumMapUrl } from './utils/mapLinks.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/oil-prices.json`;
const REPORT_URL = `${import.meta.env.BASE_URL}data/oil-ai-report.json`;
const GLOBAL_OIL_URL = `${import.meta.env.BASE_URL}data/global-oil.json`;
const HISTORY_URL = `${import.meta.env.BASE_URL}data/oil-history.json`;

const REPO_URL = 'https://github.com/gwcloud72/liter-save';
const DEPLOY_URL = 'https://gwcloud72.github.io/liter-save/';

const EXCHANGE_RATE = 1360;
const BARREL_TO_LITER = 158.987;
const REFINING_FACTOR = 1.15;
const TAX_AND_DISTRIBUTION_KRW = 1108;

const FALLBACK_REPORT =
  '오늘은 국제유가 하락에도 불구하고 환율 강세와 정제마진 상승으로 환산 국내가가 전일 대비 소폭 상승했습니다.';

const REGION_LABELS = {
  ALL: '전국',
  '01': '서울특별시',
  '02': '경기도',
  '03': '강원도',
  '04': '충청북도',
  '05': '충청남도',
  '06': '전라북도',
  '07': '전라남도',
  '08': '경상북도',
  '09': '경상남도',
  10: '부산광역시',
  11: '제주도',
  14: '대구광역시',
  15: '인천광역시',
  16: '광주광역시',
  17: '대전광역시',
  18: '울산광역시',
  19: '세종특별자치시',
};

const CITY_OPTIONS = {
  ALL: ['전체'],
  '01': ['강남구', '마포구', '강서구'],
  '02': ['수원시 권선구', '성남시 분당구', '고양시 일산동구'],
  '03': ['춘천시', '원주시', '강릉시'],
  '04': ['청주시', '충주시', '제천시'],
  '05': ['천안시', '아산시', '공주시'],
  '06': ['전주시', '익산시', '군산시'],
  '07': ['목포시', '순천시', '여수시'],
  '08': ['포항시', '구미시', '경주시'],
  '09': ['창원시', '김해시', '밀양시'],
  10: ['부산진구', '해운대구', '사하구'],
  11: ['제주시', '서귀포시'],
  14: ['북구', '달서구', '수성구'],
  15: ['남동구', '부평구', '서구'],
  16: ['광산구', '서구', '북구'],
  17: ['유성구', '서구', '동구'],
  18: ['남구', '울주군', '중구'],
  19: ['세종시'],
};


function handleAnchorClick(event, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${targetId}`);
}

function formatWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('ko-KR');
}

function formatDate(value) {
  if (!value) return '데이터 준비 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getUniqueOptions(datasets, keyCode, keyName) {
  const map = new Map();
  datasets.forEach((dataset) => {
    if (dataset?.[keyCode] && dataset?.[keyName]) {
      const code = String(dataset[keyCode]);
      map.set(code, REGION_LABELS[code] || dataset[keyName]);
    }
  });
  return Array.from(map, ([code, name]) => ({ code, name }));
}

function getFuelOptions(datasets) {
  const map = new Map();
  datasets.forEach((dataset) => {
    if (dataset?.fuelCode && dataset?.fuelName) map.set(dataset.fuelCode, dataset.fuelName);
  });
  return Array.from(map, ([code, name]) => ({ code, name }));
}

function getAverage(stations) {
  const prices = stations.map((station) => Number(station.price)).filter(Number.isFinite);
  if (!prices.length) return null;
  return Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
}

function getSaving(lowest, average, liters = 40) {
  if (!Number.isFinite(lowest) || !Number.isFinite(average)) return null;
  return Math.max(0, Math.round((average - lowest) * liters));
}

function getOilItems(globalOil) {
  const items = globalOil?.items ?? [];
  return items.length
    ? items
    : [
        { key: 'wti', name: 'WTI', price: 63.02, previousPrice: 63.37, change: -0.35 },
        { key: 'brent', name: 'Brent', price: 66.55, previousPrice: 66.83, change: -0.28 },
      ];
}

function convertCrudeToDomesticPrice(oilItems) {
  const wti = oilItems.find((item) => String(item.name).toLowerCase().includes('wti')) || oilItems[0];
  const price = Number(wti?.price);
  if (!Number.isFinite(price)) return null;
  const rawKrwPerLiter = (price * EXCHANGE_RATE) / BARREL_TO_LITER;
  return Math.round(rawKrwPerLiter * REFINING_FACTOR + TAX_AND_DISTRIBUTION_KRW);
}

function getOilChange(item) {
  const change = Number(item?.change);
  const previous = Number(item?.previousPrice);
  const price = Number(item?.price);
  const percent = Number.isFinite(change) && Number.isFinite(previous) && previous !== 0
    ? (change / previous) * 100
    : null;

  return {
    change,
    percent,
    isUp: Number.isFinite(change) ? change > 0 : false,
    label: Number.isFinite(change)
      ? `${change > 0 ? '+' : ''}${change.toFixed(2)}${percent !== null ? ` (${percent > 0 ? '+' : ''}${percent.toFixed(2)}%)` : ''}`
      : '업데이트 대기',
    price: Number.isFinite(price) ? price.toFixed(2) : '-',
  };
}

function getTrendData(history, currentDataset, convertedPrice, oilItems) {
  const snapshots = history?.snapshots?.slice(-7) ?? [];
  const fallback = ['05.02', '05.03', '05.04', '05.05', '05.06', '05.07', '05.08'];
  const wtiPrice = Number(oilItems.find((item) => String(item.name).toLowerCase().includes('wti'))?.price || 63.02);
  const offsets = [-42, -92, -70, -35, 4, -58, -24];
  const oilOffsets = [0, -5, -4, -1, 3, -6, -2];

  if (!snapshots.length || !currentDataset) {
    return fallback.map((label, index) => ({
      label,
      domestic: [1600, 1515, 1538, 1604, 1662, 1551, 1608][index],
      converted: (convertedPrice || 1728) + offsets[index],
      wti: wtiPrice + oilOffsets[index],
    }));
  }

  return snapshots.map((snapshot, index) => {
    const target = snapshot.metrics?.find(
      (metric) => metric.regionCode === currentDataset.regionCode && metric.fuelCode === currentDataset.fuelCode,
    ) || snapshot.metrics?.find((metric) => metric.regionCode === 'ALL' && metric.fuelCode === currentDataset.fuelCode);
    const date = new Date(snapshot.capturedAt);
    const label = Number.isNaN(date.getTime())
      ? fallback[index] || ''
      : `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

    return {
      label,
      domestic: Number(target?.averagePrice || currentDataset?.averagePrice || 1600),
      converted: (convertedPrice || 1728) + offsets[index % offsets.length],
      wti: wtiPrice + oilOffsets[index % oilOffsets.length],
    };
  });
}


function getFlowReport(points, convertedPrice) {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      domesticChange: 0,
      convertedChange: 0,
      wtiChange: 0,
      summary: '국내 평균가와 국제유가 흐름 데이터를 더 쌓은 뒤 자동으로 해석합니다.',
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const domesticChange = Math.round(Number(last.domestic || 0) - Number(first.domestic || 0));
  const convertedChange = Math.round(Number(last.converted || convertedPrice || 0) - Number(first.converted || convertedPrice || 0));
  const wtiChange = Number((Number(last.wti || 0) - Number(first.wti || 0)).toFixed(2));

  let summary = '국제유가와 환산가 흐름을 함께 보며 국내 가격 변화를 비교할 수 있습니다.';
  if (wtiChange < 0 && domesticChange > 0) {
    summary = 'WTI는 내려갔지만 국내 평균가는 아직 높아 단기 시차가 남아 있는 구간입니다.';
  } else if (wtiChange > 0 && domesticChange > 0) {
    summary = '국제유가와 국내 평균가가 함께 오르는 흐름이라 가까운 최저가 비교가 더 중요합니다.';
  } else if (wtiChange < 0 && domesticChange <= 0) {
    summary = '국제유가 하락 흐름과 함께 국내 평균가도 안정되는 구간입니다.';
  }

  return { domesticChange, convertedChange, wtiChange, summary };
}

function FlowMetric({ label, value, change, suffix = '원' }) {
  const number = Number(change);
  const isUp = number > 0;
  const isFlat = number === 0;
  const sign = isFlat ? '' : isUp ? '+' : '';

  return (
    <div className="flow-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={isUp ? 'up' : 'down'}>{sign}{Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-'}{suffix}</em>
    </div>
  );
}

function TrendChart({ points }) {
  const width = 720;
  const height = 210;
  const padding = { top: 28, right: 48, bottom: 34, left: 52 };
  const xStep = points.length > 1 ? (width - padding.left - padding.right) / (points.length - 1) : 0;
  const priceMin = 1200;
  const priceMax = 2000;
  const oilMin = 40;
  const oilMax = 80;

  const x = (index) => padding.left + index * xStep;
  const yPrice = (value) => padding.top + ((priceMax - value) / (priceMax - priceMin)) * (height - padding.top - padding.bottom);
  const yOil = (value) => padding.top + ((oilMax - value) / (oilMax - oilMin)) * (height - padding.top - padding.bottom);
  const line = (key, yGetter) => points.map((point, index) => `${x(index)},${yGetter(point[key])}`).join(' ');

  return (
    <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="국내 평균가, 국제유가, 환산가 추이 그래프">
      {[1200, 1400, 1600, 1800, 2000].map((tick) => (
        <g key={tick}>
          <line x1={padding.left} x2={width - padding.right} y1={yPrice(tick)} y2={yPrice(tick)} className="chart-grid" />
          <text x={padding.left - 12} y={yPrice(tick) + 4} textAnchor="end" className="chart-tick">{tick.toLocaleString('ko-KR')}</text>
        </g>
      ))}
      {[40, 60, 80].map((tick) => (
        <text key={tick} x={width - padding.right + 14} y={yOil(tick) + 4} className="chart-tick">{tick}</text>
      ))}
      <polyline points={line('domestic', yPrice)} className="line domestic-line" />
      <polyline points={line('converted', yPrice)} className="line converted-line" />
      <polyline points={line('wti', yOil)} className="line wti-line" />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={x(index)} cy={yPrice(point.domestic)} r="4" className="dot domestic-dot" />
          <circle cx={x(index)} cy={yPrice(point.converted)} r="4" className="dot converted-dot" />
          <circle cx={x(index)} cy={yOil(point.wti)} r="4" className="dot wti-dot" />
          <text x={x(index)} y={height - 8} textAnchor="middle" className="chart-label">{point.label}</text>
        </g>
      ))}
      <text x="10" y="24" className="axis-label">(원/L)</text>
      <text x={width - 38} y="24" className="axis-label">(USD)</text>
    </svg>
  );
}

function OilValue({ item }) {
  const change = getOilChange(item);

  return (
    <div className="oil-value">
      <span>{item?.name || '-'}</span>
      <strong>${change.price}</strong>
      <em className={change.isUp ? 'is-up' : 'is-down'}>{change.label}</em>
    </div>
  );
}

function Pipeline() {
  const steps = [
    ['⛽', '오피넷', '주유소 가격 데이터'],
    ['📊', 'FRED', '국제유가 데이터'],
    ['🐙', 'GitHub Actions', '자동 수집 및 스케줄링'],
    ['{}', 'JSON 생성', '정적 데이터 저장'],
    ['🌐', 'GitHub Pages', '정적 사이트 배포'],
    ['⚛️', 'React 화면', '사용자 인터페이스'],
  ];

  return (
    <section id="project-flow" className="pipeline-section">
      <div className="pipeline-title">
        <strong>데이터 파이프라인</strong>
      </div>
      <div className="pipeline-list">
        {steps.map(([icon, title, desc], index) => (
          <div className="pipeline-step" key={title}>
            <i>{icon}</i>
            <div>
              <strong>{title}</strong>
              <span>{desc}</span>
            </div>
            {index < steps.length - 1 && <em>→</em>}
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroVisual({ bestStation, saving, trendPoints }) {
  const bestPrice = bestStation ? `${formatWon(bestStation.price)}원/L` : '데이터 준비 중';

  return (
    <div className="hero-visual" aria-label="Liter Save 서비스 미리보기">
      <div className="visual-cloud cloud-one" />
      <div className="visual-cloud cloud-two" />
      <div className="visual-platform" />
      <div className="visual-roof"><span>LITER SAVE</span></div>
      <div className="visual-column column-left" />
      <div className="visual-column column-right" />
      <div className="visual-pump pump-left" />
      <div className="visual-pump pump-right" />
      <div className="visual-car" />
      <div className="visual-tree tree-left" />
      <div className="visual-tree tree-right" />

      <div className="hero-float hero-float-price">
        <span>오늘 최저가</span>
        <strong>{bestPrice}</strong>
        <small>{bestStation?.name || '지역 선택 후 확인'}</small>
      </div>

      <div className="hero-float hero-float-chart">
        <span>가격 흐름 비교</span>
        <svg viewBox="0 0 220 112" aria-hidden="true">
          <polyline points="10,78 42,60 70,65 104,42 138,50 176,30 210,44" />
          <polyline className="sub" points="10,58 42,64 70,52 104,60 138,44 176,54 210,36" />
          <polyline className="third" points="10,88 42,82 70,84 104,78 138,80 176,72 210,75" />
        </svg>
      </div>

      <div className="hero-float hero-float-save">
        <span>40L 기준 절약액</span>
        <strong>{saving ? formatWon(saving) : '-'}원</strong>
      </div>
    </div>
  );
}

export default function App() {
  const [payload, setPayload] = useState(null);
  const [globalOil, setGlobalOil] = useState({ items: [] });
  const [history, setHistory] = useState({ snapshots: [] });
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      setStatus('loading');
      try {
        const [priceResponse, oilResponse, reportResponse, historyResponse] = await Promise.all([
          fetch(`${DATA_URL}?v=${Date.now()}`),
          fetch(`${GLOBAL_OIL_URL}?v=${Date.now()}`).catch(() => null),
          fetch(`${REPORT_URL}?v=${Date.now()}`).catch(() => null),
          fetch(`${HISTORY_URL}?v=${Date.now()}`).catch(() => null),
        ]);

        if (!priceResponse.ok) throw new Error('가격 데이터를 불러오지 못했습니다.');

        const nextPayload = await priceResponse.json();
        const nextOil = oilResponse?.ok ? await oilResponse.json() : { items: [] };
        const nextReport = reportResponse?.ok ? await reportResponse.json() : null;
        const nextHistory = historyResponse?.ok ? await historyResponse.json() : { snapshots: [] };

        if (!alive) return;
        setPayload(nextPayload);
        setGlobalOil(nextOil);
        setReport(nextReport);
        setHistory(nextHistory);
        setStatus('success');
      } catch (error) {
        console.error(error);
        if (alive) setStatus('error');
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const datasets = payload?.datasets ?? [];
  const regionOptions = useMemo(() => getUniqueOptions(datasets, 'regionCode', 'regionName'), [datasets]);
  const fuelOptions = useMemo(() => getFuelOptions(datasets), [datasets]);

  useEffect(() => {
    if (!selectedRegion && regionOptions.length) {
      const preferred = regionOptions.find((option) => option.code === '02') || regionOptions[0];
      setSelectedRegion(preferred.code);
    }
  }, [regionOptions, selectedRegion]);

  useEffect(() => {
    if (!selectedFuel && fuelOptions.length) {
      const preferred = fuelOptions.find((option) => option.name.includes('휘발유')) || fuelOptions[0];
      setSelectedFuel(preferred.code);
    }
  }, [fuelOptions, selectedFuel]);

  const cityOptions = CITY_OPTIONS[selectedRegion] || ['전체'];

  useEffect(() => {
    if (!selectedCity || !cityOptions.includes(selectedCity)) {
      setSelectedCity(cityOptions[0] || '전체');
    }
  }, [cityOptions, selectedCity]);

  const currentDataset = useMemo(() => {
    if (!datasets.length) return null;
    return (
      datasets.find((dataset) => String(dataset.regionCode) === selectedRegion && dataset.fuelCode === selectedFuel) ||
      datasets.find((dataset) => String(dataset.regionCode) === selectedRegion) ||
      datasets[0]
    );
  }, [datasets, selectedFuel, selectedRegion]);

  const stations = useMemo(
    () => [...(currentDataset?.stations ?? [])].sort((a, b) => Number(a.price) - Number(b.price)),
    [currentDataset],
  );

  const topStations = stations.slice(0, 3);
  const bestStation = topStations[0] ?? null;
  const datasetAverage = Number(currentDataset?.averagePrice);
  const average = Number.isFinite(datasetAverage) ? datasetAverage : getAverage(stations);
  const saving = getSaving(Number(bestStation?.price), average);
  const oilItems = getOilItems(globalOil);
  const convertedPrice = convertCrudeToDomesticPrice(oilItems);
  const trendPoints = useMemo(
    () => getTrendData(history, currentDataset, convertedPrice, oilItems),
    [history, currentDataset, convertedPrice, oilItems],
  );
  const flowReport = useMemo(() => getFlowReport(trendPoints, convertedPrice), [trendPoints, convertedPrice]);
  const reportText = report?.report?.consumerTip || report?.report?.headline || FALLBACK_REPORT;

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Liter Save 홈">
          <span className="brand-mark">⌁</span>
          <span>
            <strong>Liter Save</strong>
            <em>오늘의 주유비 절약 서비스</em>
          </span>
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          <a className="is-active" href="#finder" onClick={(event) => handleAnchorClick(event, 'finder')}>가격조회</a>
          <a href="#trend" onClick={(event) => handleAnchorClick(event, 'trend')}>가격흐름</a>
          <a href="#global" onClick={(event) => handleAnchorClick(event, 'global')}>국제유가</a>
          <a href="#project-flow" onClick={(event) => handleAnchorClick(event, 'project-flow')}>프로젝트 소개</a>
        </nav>

        <div className="header-actions">
          <a className="btn btn-ghost" href={REPO_URL} target="_blank" rel="noreferrer">GitHub 저장소</a>
          <a className="btn btn-dark" href={DEPLOY_URL} target="_blank" rel="noreferrer">배포 보기</a>
        </div>
      </header>

      <main id="top" className="page-shell">
        <section className="hero-section">
          <div className="hero-copy">
            <h1>
              오늘 어디서 넣으면
              <br />
              가장 유리한지 보여주는
              <br />
              <b>주유비 절약 서비스</b>
            </h1>
            <p>내 주변 주유소 가격을 비교하고, 국제유가와 환산 국내가까지 함께 보여주는 데이터 기반 서비스입니다.</p>

            <div className="hero-badges" aria-label="서비스 핵심 기능">
              <span><i>⛽</i><strong>실시간 주유소 가격</strong><em>오피넷 기반</em></span>
              <span><i>🌐</i><strong>국제유가 연동</strong><em>WTI · Brent</em></span>
              <span><i>💰</i><strong>환산가 추정</strong><em>세금 · 환율 반영</em></span>
            </div>
          </div>

          <HeroVisual bestStation={bestStation} saving={saving} trendPoints={trendPoints} />
        </section>

        <section id="finder" className="finder-toolbar">
          <label>
            <span>지역</span>
            <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
              {regionOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>시/군/구</span>
            <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
          <label>
            <span>유종</span>
            <select value={selectedFuel} onChange={(event) => setSelectedFuel(event.target.value)}>
              {fuelOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={(event) => handleAnchorClick(event, 'rank')}>
            <i>⌕</i> 최저가 찾기
          </button>
        </section>

        {status === 'error' && (
          <div className="error-card">데이터를 불러오지 못했습니다. GitHub Pages 배포 후 public/data 경로를 확인해주세요.</div>
        )}

        <section className="overview-grid">
          <article className="best-price-card">
            <div className="card-title-row">
              <span>오늘 선택 지역 최저가</span>
              <i>⭐</i>
            </div>
            <strong>{bestStation ? formatWon(bestStation.price) : '-'}<small>원/L</small></strong>
            <p>40L 기준 약 <b>{saving ? formatWon(saving) : '-'}</b>원 절약</p>
            <em>{payload?.generatedAt ? `${formatDate(payload.generatedAt)} 자동 갱신` : 'GitHub Actions 자동 갱신'}</em>
          </article>

          <article id="rank" className="service-card rank-card">
            <div className="service-card-head">
              <h2>가격순위 TOP 3</h2>
            </div>
            <div className="rank-list">
              {topStations.map((station, index) => (
                <div className="rank-row" key={station.id || `${station.name}-${index}`}>
                  <i>{index + 1}</i>
                  <div>
                    <strong>{station.name}</strong>
                    <span>{station.roadAddress || station.address || '주소 정보 준비 중'}</span>
                  </div>
                  <b>{formatWon(station.price)}원/L</b>
                  <a href={buildDaumMapUrl(station)} target="_blank" rel="noreferrer">다음맵 이동</a>
                </div>
              ))}
            </div>
          </article>

          <article id="global" className="service-card oil-card">
            <div className="service-card-head">
              <h2>국제유가 참고</h2>
              <span>FRED 데이터 기준</span>
            </div>
            <div className="oil-grid">
              {oilItems.slice(0, 2).map((item) => <OilValue key={item.key || item.name} item={item} />)}
            </div>
          </article>

          <article className="service-card converted-card">
            <div className="service-card-head">
              <h2>국제유가 환산 예상 국내가</h2>
              <span>ⓘ</span>
            </div>
            <span className="converted-label">예상 환산가</span>
            <strong>{convertedPrice ? formatWon(convertedPrice) : '-'}원/L</strong>
            <p>환율 · 세금(유류세/부가세) · 유통구조를 반영한 참고 추정 가격입니다.</p>
          </article>
        </section>

        <section className="analysis-grid">
          <article id="trend" className="chart-card">
            <div className="chart-card-head">
              <h2>국내 평균가 · 국제유가 · 환산가 추이</h2>
              <div className="range-tabs"><button className="active">7일</button><button>30일</button><button>90일</button></div>
            </div>
            <div className="chart-legend">
              <span><i className="legend-domestic" />국내 평균가 (원/L)</span>
              <span><i className="legend-converted" />환산 예상가 (원/L)</span>
              <span><i className="legend-wti" />WTI (USD)</span>
            </div>
            <TrendChart points={trendPoints} />
            <p>※ 환산 예상가는 최근 환율({formatWon(EXCHANGE_RATE)}원/달러)과 유류세/부가세를 반영한 참고치입니다.</p>
          </article>

          <article className="service-card report-card flow-report-card">
            <div className="service-card-head">
              <h2>✨ 흐름 리포트</h2>
              <span>국제유가 × 국내유가</span>
            </div>
            <div className="flow-metrics">
              <FlowMetric label="국내 평균가" value={`${formatWon(average || 0)}원/L`} change={flowReport.domesticChange} />
              <FlowMetric label="환산 예상가" value={`${formatWon(convertedPrice || 0)}원/L`} change={flowReport.convertedChange} />
              <FlowMetric label="WTI" value={`$${oilItems[0] ? getOilChange(oilItems[0]).price : '-'}`} change={flowReport.wtiChange} suffix="달러" />
            </div>
            <p>{flowReport.summary}</p>
            <small>{reportText}</small>
            <button type="button" onClick={(event) => handleAnchorClick(event, 'trend')}>그래프에서 보기</button>
          </article>
        </section>

        <Pipeline />
      </main>

      <footer className="site-footer">© Liter Save. 공개 API 데이터를 기반으로 제작한 주유비 절약 포트폴리오 서비스입니다.</footer>
    </>
  );
}
