import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10
                      flex flex-col sm:flex-row
                      items-start sm:items-center
                      justify-between gap-6 text-sm text-gray-600">

        {/* ================= LEFT ================= */}
        <div>
          <p className="font-semibold text-gray-900">
            CX Nexus
          </p>

          <p className="mt-1 text-xs leading-relaxed">
            Google 비즈니스 프로필 리뷰 데이터를 기반으로<br />
            고객 경험(CX)을 분석하는 서비스입니다.
          </p>

          <p className="mt-3 text-xs text-gray-400">
            © {new Date().getFullYear()} ㈜JKAX. All rights reserved.
            <br />
            CX Nexus는 ㈜JKAX가 운영하는 서비스입니다.
          </p>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="flex flex-col sm:items-end gap-2 text-xs">
          <Link
            href="/privacy"
            className="hover:text-gray-900"
          >
            개인정보처리방침
          </Link>

          <Link
            href="/terms"
            className="hover:text-gray-900"
          >
            이용약관
          </Link>

          <a
            href="https://www.jkax.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900"
          >
            회사 소개 (JKAX)
          </a>

          <a
            href="mailto:injoo.mun@jkax.co.kr"
            className="mt-1 hover:text-gray-900"
          >
            문의: contact@jkax.co.kr
          </a>
        </div>
      </div>
    </footer>
  );
}
