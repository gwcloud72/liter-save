export default function NoticeCard() {
  return (
    <section className="notice-card" aria-label="데이터 안내">
      <strong>안내</strong>
      <p>
        가격 정보는 공개 데이터 기준이며 실제 판매 가격과 차이가 있을 수 있습니다.
        가까운 순과 가성비 추천은 조회된 주유소 기준으로 계산한 참고용 정보입니다.
        현재 위치 정보와 즐겨찾기는 브라우저 안에서만 사용되며 서버에 저장하지 않습니다.
        데이터 출처: 한국석유공사 오피넷 / 공공데이터포털.
      </p>
    </section>
  );
}
