"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

/* ✅ API BASE */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GoogleLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const justLoggedOut =
      sessionStorage.getItem("just_logged_out") === "1";

    if (justLoggedOut) {
      sessionStorage.removeItem("just_logged_out");
      return;
    }

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
        console.error(e);
      }
    };

    checkAlreadyLoggedIn();
  }, [router]);

  const handleGoogleLogin = () => {
    if (isLoading) return;
    setIsLoading(true);
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* ================= 로그인 카드 ================= */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-9">

          {/* 브랜드 / 서비스 설명 */}
          <div className="mb-7 text-center">
            {/* 로고 */}
            <div className="mx-auto mb-4 relative h-14 w-14 rounded-2xl bg-blue-50 overflow-hidden">
              <Image
                src="/icon.png"
                alt="CX Nexus Logo"
                fill
                className="object-contain scale-110"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              CX Nexus
            </h1>

            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Google 비즈니스 프로필 리뷰 데이터를 분석해<br />
              매장 운영에 필요한 고객 경험 인사이트를 제공합니다
            </p>
          </div>

          {/* 구분선 */}
          <div className="my-6 border-t border-gray-100" />

          {/* 로그인 안내 */}
          <div className="text-center mb-5">
            <h2 className="text-base font-semibold text-gray-800">
              Google 비즈니스 계정으로 로그인
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              매장 데이터를 불러오기 위해 Google 계정 로그인이 필요합니다.
            </p>
          </div>

          {/* 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className={`
              w-full flex items-center justify-center gap-3
              rounded-xl border
              px-6 py-4
              text-sm font-semibold
              transition
              ${isLoading
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:shadow-sm"
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                로그인 중입니다…
              </>
            ) : (
              <>
                {/* Google 아이콘 */}
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
                Google 계정으로 계속하기
              </>
            )}
          </button>

          {/* 권한 안내 */}
          <p className="mt-5 text-center text-xs text-gray-400">
            Google 비즈니스 프로필의 리뷰 및 인사이트 정보만<br />
            읽기 전용으로 사용합니다.
          </p>
        </div>
      </div>
    </main>
  );
}
