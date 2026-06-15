import { readFileSync } from 'node:fs';

const files = {
  kakao: 'src/utils/kakao.ts',
  feature: 'src/components/feature/liter.tsx',
  home: 'src/pages/HomePage.tsx',
  tabs: 'src/pages/tabs/LiterTabs.tsx',
  distance: 'src/utils/stationDistance.ts',
};
const errors = [];
const read = (file) => readFileSync(file, 'utf8');
const kakao = read(files.kakao);
const feature = read(files.feature);
const home = read(files.home);
const tabs = read(files.tabs);
const distance = read(files.distance);

if (!kakao.includes('map.kakao.com/link/to/')) errors.push('카카오맵 좌표 길찾기 link/to URL이 없습니다.');
if (!kakao.includes('map.kakao.com/link/search/')) errors.push('좌표 없는 주유소의 카카오맵 검색 fallback이 없습니다.');
if (!feature.includes('kakaoRouteHref(best)')) errors.push('지도 패널 큰 버튼이 추천 주유소 목적지를 사용하지 않습니다.');
if (!feature.includes('kakaoRouteHref(station)')) errors.push('주유소 카드 길찾기 버튼이 목적지를 사용하지 않습니다.');
if (!home.includes('sortStationsByUserDistance(data.stations, userCoordinates)')) errors.push('홈 내 위치 API 실패 시 정적 거리 계산 fallback이 없습니다.');
if (!tabs.includes('sortStationsByUserDistance(data.stations, userCoordinates)')) errors.push('가격지도 내 위치 API 실패 시 정적 거리 계산 fallback이 없습니다.');
if (!distance.includes('formatDistanceKm')) errors.push('0km 표시 방지용 거리 표시 함수가 없습니다.');
if (feature.includes('{station.distance}km') || feature.includes('{best.distance}km') || home.includes('{best.distance}km') || tabs.includes('{selected.distance}km') || tabs.includes('{best.distance}km')) errors.push('거리 0km가 그대로 노출될 수 있습니다. formatDistanceKm를 사용하세요.');

if (errors.length) {
  console.error('map-interaction:check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('map-interaction:check passed');
