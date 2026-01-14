"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Loader2,
} from "lucide-react";

/* ================= MOCK ================= */
const MOCK_STORES = [
  {
    id: "store_1",
    name: "인주네 파스타",
    address: "서울 강남구",
    rating: 4.6,
    reviews: 128,
  },
  {
    id: "store_2",
    name: "문인주 카페",
    address: "서울 마포구",
    rating: 4.3,
    reviews: 76,
  },
];

/* ✅ 컴포넌트 밖에서 API BASE 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function StoresPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [navigating, setNavigating] = useState(false); // ⭐ 이동 로딩 상태

  /* ================= 로그인 가드 ================= */
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
          return;
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

  /* ================= 로그아웃 ================= */
  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
  };

  /* ================= 로그인 확인 중 ================= */
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-sm text-gray-400 animate-pulse">
          로그인 상태 확인 중…
        </p>
      </main>
    );
  }

  /* ================= UI ================= */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      {/* 🔥 페이지 이동 로딩 오버레이 */}
      {navigating && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur
                        flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">
            매장 리뷰 분석 화면으로 이동 중…
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            메인으로
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20">
        {/* Title */}
        <div className="mb-14">
          <h1 className="text-4xl font-extrabold mb-3">
            내 매장 리뷰 분석
          </h1>
          <p className="text-gray-600 text-lg">
            Google 리뷰를 기반으로 매장별 고객 인사이트를 확인하세요
          </p>
        </div>

        {/* Store Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {MOCK_STORES.map((store) => (
            <div
              key={store.id}
              className="
                bg-white rounded-3xl p-8
                border border-gray-100
                shadow-sm hover:shadow-2xl
                transition hover:-translate-y-1
              "
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Store className="w-6 h-6 text-blue-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      {store.name}
                    </h2>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      {store.address}
                    </div>
                  </div>
                </div>

                <span className="px-4 py-1 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
                  운영중
                </span>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Star className="w-5 h-5 text-yellow-400" />
                  {store.rating}
                </div>

                <div className="text-sm text-gray-500">
                  리뷰 {store.reviews.toLocaleString()}개
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  setNavigating(true);
                  router.push(`/stores/${store.id}`);
                }}
                disabled={navigating}
                className="
                  w-full flex items-center justify-center gap-2
                  px-6 py-4 rounded-2xl
                  bg-blue-600 text-white font-semibold
                  shadow-lg shadow-blue-600/20
                  hover:bg-blue-700 hover:shadow-xl
                  transition active:scale-[0.99]
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                {navigating ? "이동 중…" : "이 매장 리뷰 분석하기"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}