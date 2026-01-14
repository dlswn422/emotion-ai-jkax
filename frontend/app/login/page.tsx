"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleLoginPage() {
  const router = useRouter();

  // ✅ 환경변수 기반 API URL (로컬 / 배포 자동 분기)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`, {
          credentials: "include", // ⭐⭐⭐ 쿠키 인증 핵심
        });
        const data = await res.json();

        // 이미 로그인된 경우 메인 화면으로 이동
        if (data.logged_in) {
          router.replace("/");
        }
      } catch (e) {
        // 네트워크 오류 시 로그인 화면 유지
        console.error(e);
      }
    };

    checkAlreadyLoggedIn();
  }, [router, API_URL]);

  const handleGoogleLogin = () => {
    // ✅ Google OAuth는 fetch ❌ → 브라우저 이동 ⭕
    window.location.href = `${API_URL}/auth/google/login`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">
          🔐 Google 비즈니스 로그인
        </h1>

        <p className="text-gray-600 mb-8">
          본인 매장의 리뷰를 분석하려면
          <br />
          Google 비즈니스 계정으로 로그인하세요
        </p>

        <button
          onClick={handleGoogleLogin}
          className="px-8 py-4 rounded-xl bg-blue-600 text-white
                     font-semibold hover:bg-blue-700 transition"
        >
          Google로 로그인
        </button>
      </div>
    </main>
  );
}
