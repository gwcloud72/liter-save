export type TextContrastToken = {
  role: string;
  token: string;
  hex: string;
  background: string;
  beforeHex: string;
  beforeRatio: number;
  afterRatio: number;
  minimum: number;
  status: 'pass';
  note: string;
};

export type NonTextColorToken = {
  role: string;
  token: string;
  hex: string;
  usage: string;
};

export const nonTextColorTokens: NonTextColorToken[] = [
  { role: 'border', token: '--border-muted', hex: '#E7DED5', usage: '카드·입력 테두리 전용, 텍스트 금지' },
  { role: 'divider', token: '--divider-muted', hex: '#E7DED5', usage: '목록 구분선 전용, 텍스트 금지' },
  { role: 'skeleton', token: '--state-loading-bg', hex: '#EEEEEE/#F5F5F5', usage: '로딩 면 전용, 텍스트 금지' },
];

export const textContrastTokens: TextContrastToken[] = [
  {
    "role": "본문",
    "token": "--text-body",
    "hex": "#444444",
    "background": "#FFFFFF",
    "beforeHex": "#6B7280",
    "beforeRatio": 4.83,
    "afterRatio": 9.74,
    "minimum": 4.5,
    "status": "pass",
    "note": "가격 설명 본문을 안정 대비로 고정"
  },
  {
    "role": "캡션",
    "token": "--text-caption",
    "hex": "#6B7280",
    "background": "#FFFFFF",
    "beforeHex": "#9CA3AF",
    "beforeRatio": 2.54,
    "afterRatio": 4.83,
    "minimum": 4.5,
    "status": "pass",
    "note": "거리·조건 캡션을 AA 통과값으로 상향"
  },
  {
    "role": "플레이스홀더",
    "token": "--text-placeholder",
    "hex": "#6B7280",
    "background": "#FFFFFF",
    "beforeHex": "#9CA3AF",
    "beforeRatio": 2.54,
    "afterRatio": 4.83,
    "minimum": 4.5,
    "status": "pass",
    "note": "검색 힌트도 흐리지 않게 고정"
  },
  {
    "role": "링크/오렌지 텍스트",
    "token": "--text-link",
    "hex": "#7C2D12",
    "background": "#FFFFFF",
    "beforeHex": "#EA580C",
    "beforeRatio": 3.18,
    "afterRatio": 9.37,
    "minimum": 4.5,
    "status": "pass",
    "note": "오렌지 텍스트는 CTA보다 어두운 토큰으로 고정"
  },
  {
    "role": "배지 텍스트",
    "token": "--text-badge",
    "hex": "#374151",
    "background": "#F3F4F6",
    "beforeHex": "#9A3412",
    "beforeRatio": 6.64,
    "afterRatio": 8.33,
    "minimum": 4.5,
    "status": "pass",
    "note": "배지는 정보용이라 뉴트럴 텍스트로 강등"
  }
];
