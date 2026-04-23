import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1. 기존 백엔드 API 연결 (api.cxnexus.ai)
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://localhost:8000/:path*"
            : "https://api.cxnexus.ai/:path*",
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
      // 4. [핵심] 민심지도 API 호출 대응 (8000번 포트로 우회)
      // Genspark 코드 내 API_BASE 로직이 cxnexus 도메인에서도 8000번 주소를 만들도록 유도하거나, 
      // 직접 8000번대로 들어오는 요청을 처리합니다.
      {
        source: "/api/dashboard/:path*",
        destination: "https://8000-i8bvwnut7u8718dhyz4f8-2e1b9533.sandbox.novita.ai/api/dashboard/:path*",
      },
    ];
  },
};

export default nextConfig;