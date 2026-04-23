# 리터세이브 — 최저가 주유소 찾기

React와 한국석유공사 오피넷 Open API를 활용한 지역별 최저가 주유소 조회 서비스입니다.

유종과 지역을 선택하면 공개 데이터 기준 최저가 주유소 목록을 가격 낮은 순으로 확인할 수 있습니다.

> 본 프로젝트는 포트폴리오 및 학습 목적으로 제작되었습니다.


## 주요 기능

- 유종별 최저가 주유소 조회
- 지역별 최저가 주유소 조회
- 가격 낮은 순 정렬
- 페이지네이션 기반 목록 표시 (페이지당 10개)
- 카카오맵 길찾기 버튼 제공
- 최저가, 평균가, 데이터 갱신 시점 표시
- GitHub Pages 정적 배포
- GitHub Actions 기반 데이터 생성 및 자동 배포
- API Key를 GitHub Actions Secret으로 관리

---

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| Frontend | React, JavaScript |
| Build Tool | Vite |
| Styling | CSS3, Responsive Layout |
| Data | JSON |
| External API | 한국석유공사 오피넷 Open API |
| Automation | Node.js Script, proj4 |
| CI/CD | GitHub Actions |
| Deploy | GitHub Pages |
| Version Control | Git, GitHub |

---

## 프로젝트 구조

```text
.
├── .github/
│   └── workflows/
│       └── deploy-github-pages.yml
├── public/
│   ├── .nojekyll
│   └── data/
│       └── oil-prices.json
├── scripts/
│   └── fetch-opinet.mjs
├── src/
│   ├── components/
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── LICENSE
└── README.md
```

## 데이터 안내

가격 정보는 한국석유공사 오피넷 Open API 기준입니다.
실제 주유소 판매 가격과 차이가 있을 수 있습니다.

기본 상태에서는 실제 주유소 목록이 포함되어 있지 않습니다.
`OPINET_CERT_KEY`만 등록하고 GitHub Actions를 실행하면 전국 기준 데이터가 생성됩니다.
`OPINET_REGIONS`, `OPINET_FUELS`는 필요할 때만 넣는 선택 설정입니다.

---

## 라이선스

MIT License
