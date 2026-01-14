"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, MapPin } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // ✅ 환경변수 기반 API URL (로컬 / 배포 자동 분기)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`, {
          credentials: "include", // ⭐⭐⭐ 쿠키 인증 핵심
        });

        const data = await res.json();

        if (!cancelled && !data.logged_in) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
        return;
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, API_URL]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">로그인 상태 확인 중...</p>
      </main>
    );
  }

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-blue-600">
            📊 Review Insight
          </div>

          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-red-500 hover:text-red-600"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-28 text-center">
        <h1 className="text-5xl font-extrabold mb-6 leading-tight">
          리뷰 데이터를
          <br />
          <span className="text-blue-600">인사이트</span>로 바꾸세요
        </h1>

        <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-14">
          설문(CSV) 또는 Google 리뷰를 기반으로
          <br />
          AI가 고객 경험을 자동으로 분석합니다.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl
                       bg-blue-600 text-white text-lg font-semibold
                       hover:bg-blue-700 transition shadow-lg"
          >
            <UploadCloud className="w-6 h-6" />
            설문 데이터 분석 (CSV)
          </button>

          <button
            onClick={() => router.push("/stores")}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl
                       bg-white text-blue-600 text-lg font-semibold
                       border-2 border-blue-600
                       hover:bg-blue-50 transition shadow-lg"
          >
            <MapPin className="w-6 h-6" />
            Google 리뷰 분석
          </button>
        </div>
      </section>
    </main>
  );
}
