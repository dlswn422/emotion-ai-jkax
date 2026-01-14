"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";

/* ✅ 컴포넌트 밖에서 상수로 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GoogleLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
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
  }, [router]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Chrome className="h-7 w-7 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Google 비즈니스 로그인
          </h1>

          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            매장 리뷰 분석을 위해
            <br />
            Google 비즈니스 계정으로 로그인하세요
          </p>
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          className="
            w-full flex items-center justify-center gap-3
            rounded-xl border border-gray-200
            bg-white px-6 py-4
            text-sm font-semibold text-gray-700
            shadow-sm transition
            hover:bg-gray-50 hover:shadow-md
            active:scale-[0.99]
          "
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.5c0-1.7-.15-3.33-.43-4.91H24v9.29h12.4c-.54 2.9-2.18 5.36-4.66 7.03l7.19 5.59C42.99 37.36 46.1 31.47 46.1 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M10.54 28.41c-.48-1.43-.76-2.95-.76-4.41s.27-2.98.76-4.41l-7.98-6.19C.92 16.21 0 20.02 0 24s.92 7.79 2.56 11.22l7.98-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.19-5.59c-2 1.34-4.56 2.13-8.72 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>

          Google로 계속하기
        </button>

        {/* 하단 설명 */}
        <p className="mt-6 text-center text-xs text-gray-500">
          로그인 시 Google 비즈니스 리뷰 읽기 권한만 사용됩니다.
        </p>
      </div>
    </main>
  );
}