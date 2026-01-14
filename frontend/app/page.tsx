"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, MapPin, LogOut } from "lucide-react";

/* ✅ 컴포넌트 밖에서 API_BASE 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  /* =========================
     로그인 가드
  ========================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
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
  }, [router]);

  /* =========================
     로딩 상태
  ========================= */
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-sm text-gray-400 animate-pulse">
          로그인 상태 확인 중…
        </p>
      </main>
    );
  }

  /* =========================
     로그아웃
  ========================= */
  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    router.replace("/login");
  };

  /* =========================
     UI
  ========================= */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-extrabold tracking-tight text-blue-600">
            Review Insight
          </div>

          <button
            onClick={handleLogout}
            className="
              inline-flex items-center gap-2
              text-sm font-semibold text-gray-500
              hover:text-red-500 transition
            "
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-8 leading-tight">
          리뷰 데이터를
          <br />
          <span className="text-blue-600">실행 가능한 인사이트</span>로
        </h1>

        <p className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto mb-16 leading-relaxed">
          설문 데이터(CSV) 또는 Google 리뷰를 기반으로
          <br />
          AI가 고객 경험을 자동으로 분석합니다.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {/* Primary CTA */}
          <button
            onClick={() => router.push("/upload")}
            className="
              inline-flex items-center justify-center gap-3
              px-10 py-5 rounded-2xl
              bg-blue-600 text-white
              text-lg font-semibold
              shadow-xl shadow-blue-600/20
              hover:bg-blue-700 hover:shadow-2xl
              transition active:scale-[0.99]
            "
          >
            <UploadCloud className="w-6 h-6" />
            설문 데이터 분석
          </button>

          {/* Secondary CTA */}
          <button
            onClick={() => router.push("/stores")}
            className="
              inline-flex items-center justify-center gap-3
              px-10 py-5 rounded-2xl
              bg-white text-blue-600
              text-lg font-semibold
              border-2 border-blue-600
              shadow-lg
              hover:bg-blue-50 hover:shadow-xl
              transition active:scale-[0.99]
            "
          >
            <MapPin className="w-6 h-6" />
            Google 리뷰 분석
          </button>
        </div>
      </section>
    </main>
  );
}