import { card, compactInput, pill, regions, shell, stations, trendPoints } from './showcaseData.js';

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky-600 text-white shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3C8.5 7.4 6 10.7 6 14.2A6 6 0 0 0 18 14.2C18 10.7 15.5 7.4 12 3Z" />
        </svg>
      </span>
      <div>
        <p className="text-[15px] font-black tracking-tight text-slate-950">Liter Save</p>
        
      </div>
    </div>
  );
}

function DesktopNav() {
  const tabs = ['홈', '지역별 비교', '유종별 시세', '가격 리포트', '관심 목록'];
  return (
    <header className="flex h-[58px] items-center justify-between border-b border-slate-100 px-6">
      <Logo />
      <nav className="flex items-center gap-5" aria-label="쇼케이스 주요 메뉴">
        {tabs.map((tab, index) => (
          <a key={tab} href="#/showcase" aria-current={index === 0 ? 'page' : undefined} className={index === 0 ? 'text-[12px] font-extrabold text-slate-950' : 'text-[12px] font-semibold text-slate-500'}>
            {tab}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
        <span className={pill}>기준일 05.24</span>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">새로고침</span>
      </div>
    </header>
  );
}

function SearchPanel() {
  return (
    <section className="mx-6 mt-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_2fr_1fr_auto] gap-3">
        <span className={compactInput}>서울</span>
        <span className={compactInput}>휘발유</span>
        <span className={compactInput}>주유소명·주소 검색</span>
        <span className={compactInput}>가격 낮은순</span>
        <span className="grid h-9 place-items-center rounded-xl bg-slate-950 px-5 text-[12px] font-black text-white">검색</span>
      </div>
    </section>
  );
}

function SummaryCards() {
  const items = [
    ['서울 평균', '1,678원', '전일 대비 -12원'],
    ['최저가 후보', '1,589원', '평균보다 89원 낮음'],
    ['조회 지점', '24곳', '셀프 16곳 포함'],
  ];
  return (
    <section className="mx-6 mt-4 grid grid-cols-3 gap-3">
      {items.map(([label, value, meta]) => (
        <article key={label} className={`${card} p-4`}>
          <p className="text-[11px] font-bold text-slate-400">{label}</p>
          <p className="mt-2 text-[25px] font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] font-semibold text-sky-700">{meta}</p>
        </article>
      ))}
    </section>
  );
}

function StationTable() {
  return (
    <article className={`${card} min-w-0 p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-black tracking-tight">최저가 주유소</h2>
        <span className="text-[11px] font-semibold text-slate-400">TOP 4</span>
      </div>
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">쇼케이스 최저가 주유소 표</caption>
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <th className="w-[32%] px-3 py-2">주유소</th>
            <th className="w-[34%] px-3 py-2">주소</th>
            <th className="w-[15%] px-3 py-2 text-right">가격</th>
            <th className="w-[12%] px-3 py-2 text-right">평균대비</th>
            <th className="w-[7%] px-3 py-2 text-right">구분</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {stations.map(([name, address, price, diff, tag], index) => (
            <tr key={name} className={index === 0 ? 'bg-sky-50/45' : ''}>
              <td className="truncate px-3 py-3 text-[12px] font-black text-slate-900">{name}</td>
              <td className="truncate px-3 py-3 text-[11px] font-medium text-slate-500">{address}</td>
              <td className="px-3 py-3 text-right text-[13px] font-black tabular-nums text-sky-700">{price}</td>
              <td className="px-3 py-3 text-right text-[11px] font-bold tabular-nums text-emerald-600">{diff}</td>
              <td className="px-3 py-3 text-right text-[10px] font-bold text-slate-400">{tag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function TrendChart() {
  const path = 'M12 118 C45 110 62 98 91 104 C128 112 145 74 176 77 C206 80 221 53 250 58 C279 64 299 36 332 42';
  return (
    <article className={`${card} min-w-0 p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-black tracking-tight">유가 추이</h2>
        <span className="text-[11px] font-bold text-sky-700">현재 1,589원</span>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <svg viewBox="0 0 344 150" className="h-[154px] w-full" role="img" aria-label="7일 유가 추이">
          <line x1="10" x2="334" y1="114" y2="114" stroke="#e2e8f0" strokeWidth="1" />
          <line x1="10" x2="334" y1="76" y2="76" stroke="#dbeafe" strokeDasharray="5 5" strokeWidth="1" />
          <path d={path} fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
          <circle cx="332" cy="42" r="5" fill="#0284c7" />
          <text x="251" y="28" fill="#0369a1" fontSize="12" fontWeight="800">05.24 · 1,589원</text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-500">
        <span className="rounded-xl bg-slate-50 py-2">평균 1,628원</span>
        <span className="rounded-xl bg-slate-50 py-2">최저 1,589원</span>
        <span className="rounded-xl bg-slate-50 py-2">최고 1,652원</span>
      </div>
    </article>
  );
}

function AiReport() {
  const lines = ['서울 평균보다 낮은 후보가 강서·구로에 집중됐습니다.', '휘발유는 완만한 하락 흐름이고 경유는 보합권입니다.', '셀프 주유소 중심으로 가격 차이가 크게 나타납니다.'];
  return (
    <article className={`${card} min-w-0 p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">AI REPORT</p>
      <h2 className="mt-1 text-[15px] font-black tracking-tight">AI 가격 리포트</h2>
      <div className="mt-3 space-y-2">
        {lines.map((line) => <p key={line} className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-700">{line}</p>)}
      </div>
    </article>
  );
}

function RegionCards() {
  return (
    <section className="mx-6 mt-3 grid grid-cols-4 gap-3">
      {regions.map(([region, price, count]) => (
        <article key={region} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black text-slate-500">{region}</p>
          <p className="mt-1 text-[18px] font-black text-slate-950">{price}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">최저가 후보 {count}</p>
        </article>
      ))}
    </section>
  );
}

function DesktopFrame() {
  return (
    <div className={shell.desktop}>
      <DesktopNav />
      <SearchPanel />
      <SummaryCards />
      <main id="main-content" className="mx-6 mt-4 grid grid-cols-[1.45fr_1fr] gap-4">
        <StationTable />
        <div className="min-w-0 space-y-3"><TrendChart /><AiReport /></div>
      </main>
      <RegionCards />
    </div>
  );
}

function MobileFrame() {
  return (
    <div className={shell.mobile}>
      <div className={shell.mobileScreen}>
        <div className="border-b border-slate-100 px-4 py-3">
          <Logo />
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <span className={compactInput}>서울</span>
            <span className={compactInput}>휘발유</span>
          </div>
          <div className="grid grid-cols-[1fr_42px] gap-2">
            <span className={compactInput}>주유소 검색</span>
            <span className="grid h-9 place-items-center rounded-xl border border-slate-200 bg-white text-[12px] font-black">필터</span>
          </div>
          <span className="grid h-9 place-items-center rounded-xl bg-slate-950 text-[12px] font-black text-white">검색</span>
          <article className="rounded-2xl bg-sky-600 p-4 text-white">
            <p className="text-[11px] font-bold opacity-80">서울 최저가</p>
            <p className="mt-1 text-[30px] font-black tracking-tight">1,589원</p>
            <p className="mt-1 text-[11px] font-bold opacity-90">평균보다 89원 낮은 후보 3곳</p>
          </article>
          <article className="rounded-2xl border border-sky-100 bg-sky-50 p-3"><p className="text-[10px] font-black text-sky-700">AI 리포트</p><p className="mt-1 text-[11px] font-bold leading-5 text-slate-700">강서·구로권 최저가 후보를 먼저 확인하세요.</p></article>
          <div className="space-y-2">
            {stations.slice(0, 3).map(([name, address, price, diff]) => (
              <article key={name} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black text-slate-900">{name}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-sky-700">{price}</p>
                    <p className="text-[10px] font-bold text-emerald-600">{diff}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiterSaveShowcase() {
  return (
    <div className={shell.canvas}>
      <a href="#main-content" className="sr-only focus:not-sr-only">본문 바로가기</a>
      <section className={shell.frame} aria-label="Liter Save 쇼케이스">
        <DesktopFrame />
        <MobileFrame />
      </section>
    </div>
  );
}
