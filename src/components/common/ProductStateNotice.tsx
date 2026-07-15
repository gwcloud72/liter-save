import type { ReactNode } from 'react';
import { AlertCircle, BellOff, Database, MapPinOff, RefreshCw, SearchX, Star } from 'lucide-react';
import { Button } from './Button';

export type ProductStateKind =
  | 'loading'
  | 'error'
  | 'hard-error'
  | 'empty-alerts'
  | 'empty-season'
  | 'empty-watchlist'
  | 'empty-week'
  | 'empty-filings'
  | 'location-denied'
  | 'empty-nearby'
  | 'data-expired';

const stateMap: Record<ProductStateKind, { title: string; body: string; action: string; icon: typeof AlertCircle }> = {
  loading: {
    title: '정보를 불러오는 중입니다',
    body: '잠시 뒤 가격과 일정이 채워집니다.',
    action: '새로 고침',
    icon: RefreshCw,
  },
  error: {
    title: '정보를 불러오지 못했어요',
    body: '네트워크 상태를 확인한 뒤 다시 시도하세요.',
    action: '다시 시도',
    icon: AlertCircle,
  },
  'hard-error': {
    title: '데이터를 다시 불러와야 해요',
    body: '오프라인이거나 원본 데이터를 읽지 못했습니다. 연결을 확인한 뒤 재시도하세요.',
    action: '다시 시도',
    icon: AlertCircle,
  },
  'empty-alerts': {
    title: '저장한 알림이 없어요',
    body: '원하는 가격이나 일정 조건을 저장하면 여기서 확인할 수 있습니다.',
    action: '조건 만들기',
    icon: BellOff,
  },
  'empty-season': {
    title: '지금은 표시할 가격이 없어요',
    body: '오프시즌이거나 공공 가격이 아직 들어오지 않은 품목입니다.',
    action: '다른 항목 보기',
    icon: SearchX,
  },
  'empty-watchlist': {
    title: '관심기업이 없어요',
    body: '놓치기 싫은 기업을 저장하면 일정과 공시를 모아 보여드립니다.',
    action: '기업 보기',
    icon: Star,
  },
  'empty-week': {
    title: '이번 주 청약 일정이 없어요',
    body: '다음 일정이 들어오면 오늘 화면에서 먼저 알려드립니다.',
    action: '전체 일정 보기',
    icon: BellOff,
  },
  'empty-filings': {
    title: '확인할 공시가 없어요',
    body: '새 공시가 들어오면 원문 링크와 기준 시각을 함께 보여드립니다.',
    action: '공시 새로 보기',
    icon: Database,
  },
  'location-denied': {
    title: 'GPS 위치 권한이 꺼져 있어요',
    body: '위치를 허용하거나 지역을 직접 선택해 가까운 결과를 확인하세요.',
    action: '지역 선택',
    icon: MapPinOff,
  },
  'empty-nearby': {
    title: '주변 결과를 찾지 못했어요',
    body: '검색 반경을 넓히거나 지역을 직접 선택해 다시 확인하세요.',
    action: '지역으로 보기',
    icon: SearchX,
  },
  'data-expired': {
    title: '기준 시각이 지났어요',
    body: '가격과 일정이 바뀌었을 수 있으니 최신 정보로 다시 확인하세요.',
    action: '새로 고침',
    icon: RefreshCw,
  },
};

export interface ProductStateNoticeProps {
  kind: ProductStateKind;
  onAction?: () => void;
  compact?: boolean;
  children?: ReactNode;
}

export function ProductStateNotice({ kind, onAction, compact = false, children }: ProductStateNoticeProps) {
  const state = stateMap[kind];
  const Icon = state.icon;
  return (
    <div className={`rounded-lg border border-ink-200 bg-white shadow-card ${compact ? 'p-ds-2' : 'p-ds-3'}`} data-state-kind={kind}>
      <div className="flex items-start gap-ds-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-[1.35] text-ink-900">{state.title}</h3>
          <p className="mt-ds-0.5 text-[13px] leading-[1.5] text-ink-600">{state.body}</p>
          {kind === 'loading' ? (
            <div className="mt-ds-2 grid gap-ds-1.5" aria-hidden="true">
              <span className="h-3 w-3/4 rounded-md ds-skeleton" />
              <span className="h-3 w-1/2 rounded-md ds-skeleton" />
            </div>
          ) : null}
          {children ? <div className="mt-ds-1 text-caption text-ink-600">{children}</div> : null}
        </div>
        {onAction ? <Button variant="secondary" size="sm" onClick={onAction}>{state.action}</Button> : null}
      </div>
    </div>
  );
}
