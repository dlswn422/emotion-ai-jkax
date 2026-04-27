import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1. [핵심 추가] 민심지도 API 호출을 Novita AI의 8000번 포트 백엔드로 연결
      // 502 에러를 해결하기 위해 목적지를 8000번 포트 주소로 지정합니다.
      {
        source: "/api/dashboard/:path*",
        destination: "https://8000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/api/dashboard/:path*",
      },

      // 2. 민심지도 페이지 본체 (3000번 포트)
      {
        source: "/minsim/jinju/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/:path*",
      },

      // 3. 민심지도 정적 파일 (3000번 포트)
      {
        source: "/static/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/static/:path*",
      },

      // 4. 기존 메인 백엔드 API (api.cxnexus.ai)
      // 위에서 걸러지지 않은 나머지 /api 요청은 원래대로 FastAPI 서버로 보냅니다.
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