export default function TermsPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-6">이용약관</h1>

      <p className="mb-4">
        본 약관은 CX Nexus(이하 &quot;서비스&quot;)를 운영하는
        ㈜JKAX(이하 &quot;회사&quot;)가 제공하는
        Google 비즈니스 프로필 리뷰 분석 서비스의 이용과 관련하여
        회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제1조 (서비스의 내용)
      </h2>
      <p className="mb-4">
        회사는 이용자가 본인 소유 또는 관리 권한을 가진
        Google 비즈니스 프로필 매장의 리뷰 및 관련 데이터를
        조회·분석하여 고객 경험(CX)에 대한 인사이트를 제공하는 서비스를 제공합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제2조 (이용 자격 및 계정)
      </h2>
      <ul className="list-disc ml-6 mb-4">
        <li>이용자는 본인의 Google 계정을 통해서만 서비스를 이용할 수 있습니다.</li>
        <li>
          이용자는 본인이 관리 권한을 보유한 매장 정보에 대해서만
          접근 및 분석할 수 있습니다.
        </li>
        <li>
          회사는 타인의 매장 정보에 대한 무단 접근을 허용하지 않습니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제3조 (Google 계정 연동)
      </h2>
      <p className="mb-4">
        본 서비스는 Google OAuth 인증을 통해
        Google 비즈니스 프로필 계정과 연동됩니다.
        이용자는 언제든지 Google 계정 설정을 통해
        연동을 해제할 수 있으며,
        연동 해제 시 서비스 이용이 제한될 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제4조 (이용자의 의무)
      </h2>
      <ul className="list-disc ml-6 mb-4">
        <li>이용자는 관련 법령 및 본 약관을 준수해야 합니다.</li>
        <li>
          이용자는 서비스 이용 과정에서
          허위 정보 제공 또는 부정한 접근을 시도해서는 안 됩니다.
        </li>
        <li>
          이용자는 본인의 계정 정보를 제3자에게 공유해서는 안 됩니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제5조 (서비스의 제한 및 중단)
      </h2>
      <p className="mb-4">
        회사는 시스템 점검, 보안상 필요, 관련 법령 준수 등의 사유로
        서비스의 전부 또는 일부를 일시적으로 제한하거나 중단할 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제6조 (책임의 제한)
      </h2>
      <p className="mb-4">
        회사는 Google 비즈니스 프로필을 통해 제공되는 데이터의
        정확성, 완전성, 최신성에 대해 보증하지 않으며,
        해당 데이터는 참고용 인사이트 제공 목적으로만 활용됩니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제7조 (약관의 변경)
      </h2>
      <p className="mb-4">
        회사는 관련 법령을 위반하지 않는 범위 내에서
        본 약관을 변경할 수 있으며,
        약관이 변경되는 경우 사전에 공지합니다.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        제8조 (운영사 및 문의처)
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
        서비스 이용과 관련한 문의사항은 아래 이메일로 연락 주시기 바랍니다.
        <br />
        <strong>이메일:</strong>{" "}
        <a
          href="mailto:injoo.mun@jkax.co.kr"
          className="text-blue-600 underline"
        >
          contact@jkax.co.kr
        </a>
      </p>

      <p className="text-xs text-gray-500">
        본 약관은 서비스 정책 및 관련 법령에 따라 변경될 수 있습니다.
      </p>
    </main>
  );
}
