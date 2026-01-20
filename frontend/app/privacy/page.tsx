export default function PrivacyPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>

      <p className="mb-4">
        CX Nexus(이하 &quot;서비스&quot;)는 ㈜JKAX(이하 &quot;회사&quot;)가
        운영하는 Google 비즈니스 프로필 리뷰 분석 서비스입니다.
        회사는 Google OAuth 인증을 통해 사용자의 Google 비즈니스 프로필
        (Google Business Profile) 데이터를 연동·분석하며,
        개인정보 보호법 및 관련 법령을 준수하여
        사용자의 개인정보를 안전하게 처리합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        1. 수집하는 개인정보 항목
      </h2>
      <p className="mb-2">
        회사는 서비스 제공을 위해 아래와 같은 정보를 수집·이용합니다.
      </p>
      <ul className="list-disc ml-6 mb-4">
        <li>Google 계정 기본 식별 정보 (계정 ID, 이메일)</li>
        <li>Google 비즈니스 프로필 계정 및 매장 식별 정보</li>
        <li>매장에 등록된 리뷰 내용, 평점, 작성 시점 정보</li>
        <li>서비스 이용 과정에서 생성되는 접근 로그</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        2. 개인정보의 이용 목적
      </h2>
      <ul className="list-disc ml-6 mb-4">
        <li>사용자 인증 및 계정 관리</li>
        <li>Google 비즈니스 프로필 리뷰 데이터 조회</li>
        <li>리뷰 분석 및 고객 경험(CX) 인사이트 제공</li>
        <li>서비스 품질 개선 및 내부 운영 분석</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        3. 개인정보의 보관 및 이용 기간
      </h2>
      <p className="mb-4">
        회사는 개인정보를 수집·이용 목적이 달성될 때까지 보관하며,
        사용자가 서비스 이용을 중단하거나 계정 삭제를 요청할 경우
        관련 법령에 따라 지체 없이 파기합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        4. 개인정보의 제3자 제공
      </h2>
      <p className="mb-4">
        회사는 사용자의 개인정보를 원칙적으로 외부에 제공하지 않으며,
        법령에 근거하거나 사용자의 사전 동의가 있는 경우에만 제공합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        5. 개인정보의 안전성 확보 조치
      </h2>
      <ul className="list-disc ml-6 mb-4">
        <li>HTTPS 기반 암호화 통신</li>
        <li>세션 기반 인증 및 접근 통제</li>
        <li>내부 접근 권한 최소화</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        6. 이용자의 권리
      </h2>
      <p className="mb-4">
        사용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있으며,
        Google 계정 연동 해제를 통해 서비스 이용을 중단할 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        7. 운영사 및 문의처
      </h2>
      <p className="mb-2">
        <strong>운영사:</strong> ㈜JKAX
        <br />
        <strong>회사 웹사이트:</strong>{" "}
        <a
          href="https://www.jkax.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          https://www.jkax.co.kr
        </a>
      </p>

      <p className="mb-8">
        개인정보 관련 문의사항은 아래 이메일로 연락 주시기 바랍니다.
        <br />
        <strong>이메일:</strong>{" "}
        <a
          href="mailto:contact@jkax.co.kr"
          className="text-blue-600 underline"
        >
          contact@jkax.co.kr
        </a>
      </p>

      <p className="text-xs text-gray-500">
        본 개인정보처리방침은 서비스 정책 및 관련 법령 변경에 따라
        사전 고지 후 수정될 수 있습니다.
      </p>
    </main>
  );
}
