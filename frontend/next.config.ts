import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // [1순위] Novita AI 페이지 및 내부 API 연결
      // /api/dashboard 로 들어오는 요청을 Novita AI 서버로 전달합니다.
      {
        source: "/api/dashboard/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/api/dashboard/:path*",
      },
      {
        source: "/minsim/jinju/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/:path*",
      },

      // [2순위] 정적 파일 연결
      {
        source: "/static/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/static/:path*",
      },

      // [3순위] 기존 메인 백엔드 API (FastAPI)
      // /api/dashboard 외의 다른 모든 /api 요청은 원래대로 FastAPI로 갑니다.
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