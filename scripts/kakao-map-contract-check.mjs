import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = (name) => fs.existsSync(path.join(root, name)) ? fs.readFileSync(path.join(root, name), 'utf8') : '';
const loader = read('src/utils/kakaoMapsSdk.ts');
const map = read('src/components/map/KakaoStationMap.tsx');
const feature = read('src/components/feature/liter.tsx');
const css = read('src/styles/DesignTokens.css');
const envExample = read('.env.example');
const source = [loader, map, feature, css].join('\n');

function requireText(text, needle, label) {
  if (!text.includes(needle)) errors.push(`${label} 누락`);
}

for (const [needle, label] of [
  ['https://dapi.kakao.com/v2/maps/sdk.js', '카카오 지도 JavaScript SDK URL'],
  ['appkey=${encodeURIComponent(normalizedKey)}', 'JavaScript 키 전달'],
  ['autoload=false', '명시적 SDK 로드'],
  ['sdk.load', 'SDK 준비 콜백'],
  ['new sdk.Map', '실제 지도 인스턴스'],
  ['new sdk.CustomOverlay', '가격 커스텀 오버레이'],
  ['VITE_KAKAO_MAP_APP_KEY', '환경 변수 키'],
  ['data-real-map', '실제 지도 런타임 표식'],
  ['data-map-fallback', '키·연결 실패 fallback'],
  ['ResizeObserver', '반응형 지도 relayout'],
  ['focusCurrentPosition', 'GPS 현재 위치 이동'],
  ['fitMapToContent', '전체 주유소 보기'],
]) requireText(source, needle, label);
requireText(feature, '<KakaoStationMap', '주유소 화면의 실제 지도 컴포넌트');
requireText(envExample, 'VITE_KAKAO_MAP_APP_KEY=', '.env.example 설정');
requireText(css, 'min-width: 44px', '지도 가격 마커 44px 너비');
requireText(css, 'min-height: 44px', '지도 가격 마커 44px 높이');

for (const banned of ['kakao-map-reference.png', 'kakao-map-fallback.svg', 'map-surface', 'map-marker-']) {
  if (source.includes(banned)) errors.push(`정적·모의 지도 잔존: ${banned}`);
}
for (const asset of ['src/assets/kakao-map-reference.png', 'src/assets/kakao-map-fallback.svg']) {
  if (fs.existsSync(path.join(root, asset))) errors.push(`사용하지 않는 정적 지도 자산 잔존: ${asset}`);
}

if (errors.length) {
  console.error('kakao-map:check failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('kakao-map:check passed');
console.log('real SDK map: 1, static map assets: 0, marker touch size: 44px+');
