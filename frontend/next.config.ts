import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1. 기존 백엔드 API 연결 규칙
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://localhost:8000/:path*"
            : "https://api.cxnexus.ai/:path*",
      },
      // 2. 신규 Novita AI 배포 페이지 연결 규칙
      {
        source: "/minsim/jinju/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/:path*",
      },
      // 3. 정적 파일(CSS, JS 등) 경로 연결 규칙 (추가됨)
      // 화면이 깨지는 현상을 해결하기 위해 /static으로 들어오는 요청을 Novita AI로 전달합니다.
      {
        source: "/static/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/static/:path*",
      },
    ];
  },
};

export default nextConfig;