"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
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

export default function StoresPage() {
  const router = useRouter();

  // ✅ 환경변수 기반 API URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  /* ================= 로그인 가드 ================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!cancelled && !data.logged_in) {
          router.replace("/login");
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      }
    };

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, API_URL]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-extrabold mb-3">
              📍 내 매장 분석
            </h1>
            <p className="text-gray-600 text-lg">
              Google 리뷰를 기반으로 매장별 고객 인사이트를 확인하세요
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.push("/")}
            className="
              flex items-center gap-2
              text-sm font-semibold
              text-gray-500 hover:text-blue-600
              transition
            "
          >
            <ArrowLeft className="w-4 h-4" />
            메인으로
          </button>
        </div>

        {/* Store Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {MOCK_STORES.map((store) => (
            <div
              key={store.id}
              className="
                bg-white rounded-3xl p-8
                shadow-sm hover:shadow-xl transition
                border border-gray-100
              "
            >
              {/* Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-12 h-12 rounded-2xl
                      bg-blue-50 flex items-center justify-center
                    "
                  >
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

                <span
                  className="
                    px-4 py-1 rounded-full
                    bg-green-50 text-green-700
                    text-sm font-semibold
                  "
                >
                  운영중
                </span>
              </div>

              {/* Metrics */}
              <div className="flex gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold">
                    {store.rating}
                  </span>
                </div>
                <div className="text-gray-500 text-sm">
                  리뷰 {store.reviews}개
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(`/stores/${store.id}`)}
                className="
                  w-full flex items-center justify-center gap-2
                  px-6 py-4 rounded-2xl
                  bg-blue-600 text-white font-semibold
                  hover:bg-blue-700 transition
                  shadow-md
                "
              >
                이 매장 리뷰 분석하기
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}