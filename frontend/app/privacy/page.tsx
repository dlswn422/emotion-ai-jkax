export default function PrivacyPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto text-sm">
      <h1 className="text-xl font-bold mb-4">개인정보처리방침</h1>

      <p>
        본 서비스는 Google 로그인을 통해 사용자 계정을 인증하며,
        사용자가 관리하는 매장의 리뷰 데이터를 조회·분석합니다.
      </p>

      <h2 className="font-semibold mt-4">수집하는 정보</h2>
      <ul className="list-disc ml-5">
        <li>Google 계정 식별 정보</li>
        <li>매장 식별 정보</li>
        <li>리뷰 내용 및 평점</li>
      </ul>

      <h2 className="font-semibold mt-4">이용 목적</h2>
      <p>매장 리뷰 조회, 분석 및 내부 운영 참고용</p>

      <h2 className="font-semibold mt-4">문의</h2>
      <p>support@emotion-ai.io</p>
    </main>
  );
}
