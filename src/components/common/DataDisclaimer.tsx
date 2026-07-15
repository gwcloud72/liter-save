export function DataDisclaimer() {
  return (
    <aside data-disclaimer="api-source" aria-label="데이터 이용 안내" className="mx-auto mt-ds-3 mb-24 max-w-readable rounded-xl border border-ink-200 bg-ink-50 px-ds-2 py-ds-1.5 text-[12px] leading-relaxed text-ink-700 lg:mb-0">
      <strong className="mr-ds-1 whitespace-nowrap text-ink-900">데이터 안내</strong>
      <span>OPINET 등 공개 API로 수집한 가격입니다. 실제 결제가는 주유소 현장가, 카드·제휴 조건, 갱신 시각에 따라 다를 수 있습니다.</span>
    </aside>
  );
}
