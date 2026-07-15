import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const context = read('src/context/LocationContext.tsx');
const location = read('src/utils/location.ts');
const sdk = read('src/utils/kakaoMapsSdk.ts');
const shell = read('src/pages/ProjectShell.tsx');
const home = read('src/pages/HomePage.tsx');
const distance = read('src/utils/stationDistance.ts');
const source = [context, location, sdk, shell, home, distance].join('\n');

function expect(text, snippet, label) {
  if (!text.includes(snippet)) errors.push(`${label} 누락`);
}

for (const [text, snippet, label] of [
  [context, "useState<string>('서울')", '권한 확인 전 서울 기본값'],
  [context, 'useGrantedLocation', '이미 허용된 위치 자동 적용'],
  [context, "navigator.permissions.query({ name: 'geolocation' })", '권한 상태 확인'],
  [context, 'resolveUserRegion', 'GPS 좌표 지역 해석'],
  [sdk, 'libraries=services', '카카오 주소 변환 라이브러리'],
  [location, 'coord2RegionCode', '좌표 기반 행정구역 확인'],
  [location, "['광주광역시', { administrativeRegion: '광주', dataRegion: '전남광주'", '광주 가격권역 매핑'],
  [location, "['전라남도', { administrativeRegion: '전남', dataRegion: '전남광주'", '전남 가격권역 매핑'],
  [shell, "region: result.dataRegion, location: 'gps'", '위치 결과 URL 동기화'],
  [shell, "region, location: null, station: null", '수동 지역 선택 시 GPS 상태 해제'],
  [home, 'locationButtonText', '현재 위치 지역 표시'],
  [home, 'sortStationsByUserDistance', 'GPS 거리순 재계산'],
  [distance, 'distanceKm', '좌표 기반 거리 계산'],
]) expect(text, snippet, label);

if (/localStorage\.setItem\([^\n]*(lat|lng|latitude|longitude)/i.test(source)) errors.push('GPS 원시 좌표 영구 저장 발견');
if (/setRegionState\(['"]서울['"]\)/.test(context)) errors.push('위치 수집 성공 후 서울 고정 처리 발견');
if (!source.includes("location: 'gps'")) errors.push('GPS 상태 URL 표식 누락');

if (errors.length) {
  console.error('location:check failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('location:check passed');
console.log('default Seoul until permission, GPS region sync, Kakao reverse geocoding, distance sorting: passed');
