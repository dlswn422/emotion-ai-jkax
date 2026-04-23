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
      // 2. 신규 Novita AI 배포 페이지 연결 규칙 (추가됨)
      {
        source: "/minsim/jinju/:path*",
        destination: "https://3000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/:path*",
      },
    ];
  },
};

export default nextConfig;