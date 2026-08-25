# 리터세이브 제출 준비 리포트

생성 시각: 2026-08-25T06:45:49.896Z

## 결론

- 제출 판정: **제출 가능**
- 점수: **100/100**
- 포지션: 실생활 가격 비교, 지도/길찾기, 50L 절약액 UX를 보여주는 프로젝트
- Live Demo: https://gwcloud72.github.io/liter-save/
- Repository: https://github.com/gwcloud72/liter-save

## 왜 제출 가능한가

1. 핵심 데이터 출처가 명확합니다: OPINET Open API
2. 배포 전 데이터 계약 검사와 UI/상호작용 검사를 실행하는 구조가 있습니다.
3. 데이터 상태를 `public/data/service-status.json`과 `public/data/submission-readiness.json`으로 남깁니다.
4. 사용자 문제, 데이터 수집, 서비스 운영 흐름이 분리되어 있습니다.

## 제출 전 확인해야 할 것

- Actions 수동 실행 후 oil-prices.json generatedAt과 service-status.json 상태를 확인합니다.
- 현재 데이터가 stale이면 최종 제출 전 OPINET 수집 성공 여부를 먼저 확인해야 합니다.
- 브라우저 콘솔 오류, 모바일 첫 화면, 데스크톱 첫 화면을 다시 캡처합니다.

## 현재 데이터 상태

| 항목 | 값 |
|---|---|
| 상태 | ready |
| 요약 | OPINET 가격 데이터가 운영 기준입니다. |
| Freshness policy | OPINET_MAX_DATA_AGE_HOURS=24 |

## 검사 증거

| 검사 | 상태 | 상세 |
|---|---|---|
| OPINET 가격 데이터 | pass | 51개 데이터셋, 1007개 주유소 |
| 실시간 수집 비율 | pass | 실시간 51개, 직전 정상값 0개 |
| 유종 커버리지 | pass | 3개 유종 |
| 지역 커버리지 | pass | 17개 지역 |
| 가격 기준시각 | pass | 2026.08.25 15:42, 0.0시간 전 |
| 가격 이력 | pass | 118개 스냅샷 |
| 유가 뉴스 | pass | 16건 |

## 확인 필요 항목

- 현재 별도 확인 필요 항목이 없습니다.

## 차단 항목

- 차단 항목 없음

## 운영 Runbook

자세한 배포·데이터 갱신 절차는 `docs/DEPLOYMENT_RUNBOOK.md`를 확인합니다.
