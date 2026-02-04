import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // 프론트에서 /api/* 로 호출하면
        source: "/api/:path*",

        // 실제로는 FastAPI 서버로 전달
        destination:
          process.env.NODE_ENV === "development"
            ? "http://localhost:8000/:path*"
            : "https://api.cxnexus.ai/:path*", // 🔥 배포 시 백엔드 도메인
      },
    ];
  },
};

export default nextConfig;