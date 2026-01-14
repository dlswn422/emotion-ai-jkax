"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const res = await fetch("http://localhost:8000/auth/status", {
          credentials: "include", // ⭐⭐⭐ 이게 핵심
        });
        const data = await res.json();

        // 이미 로그인된 경우 메인 화면으로 이동
        if (data.logged_in) {
          router.replace("/");
        }
      } catch (e) {
        // 네트워크 오류 시에는 그냥 로그인 화면 유지
        console.error(e);
      }
    };

    checkAlreadyLoggedIn();
  }, []); // router dependency 제거

  const handleGoogleLogin = () => {
    // FastAPI Google OAuth 엔드포인트로 이동
    window.location.href =
      "http://localhost:8000/auth/google/login";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">
          🔐 Google 비즈니스 로그인
        </h1>

        <p className="text-gray-600 mb-8">
          본인 매장의 리뷰를 분석하려면<br />
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