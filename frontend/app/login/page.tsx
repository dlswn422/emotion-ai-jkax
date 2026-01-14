"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* ✅ 컴포넌트 밖에서 상수로 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GoogleLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include", // ⭐ 쿠키 인증 필수
        });

        const data = await res.json();

        if (data.logged_in) {
          router.replace("/");
        }
      } catch (e) {
        console.error("auth status check failed", e);
      }
    };

    checkAlreadyLoggedIn();
  }, [router]); // ✅ API_BASE 제거 (중요!)

  const handleGoogleLogin = () => {
    // ✅ OAuth는 반드시 브라우저 이동
    window.location.href = `${API_BASE}/auth/google/login`;
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