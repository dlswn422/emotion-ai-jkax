import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1. [우선순위 1] Novita AI 페이지 본체 연결
      {
        source: "/minsim/jinju",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/",
      },
      {
        source: "/minsim/jinju/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/:path*",
      },

      // 2. [우선순위 2] Novita AI 전용 정적 파일 (CSS, JS 등)
      {
        source: "/static/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/static/:path*",
      },

      // 3. [우선순위 3] Novita AI 내부 API 호출 대응
      // 스크린샷의 502 에러를 해결하기 위해 대시보드 관련 API를 Novita 서버로 전달합니다.
      {
        source: "/api/dashboard/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/api/dashboard/:path*",
      },

      // 4. [우선순위 4] 기존 메인 백엔드 API (FastAPI)
      // 가장 포괄적인 규칙이므로 마지막에 배치합니다.
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://localhost:8000/:path*"
            : "https://api.cxnexus.ai/:path*",
      },
    ];
  },
};

export default nextConfig;