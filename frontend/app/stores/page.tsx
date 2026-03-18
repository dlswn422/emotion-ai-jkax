"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Star,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Eye,
} from "lucide-react";

import AppHeader from "@/components/common/AppHeader";

/* ================= MOCK ================= */
const MOCK_STORES = [
  {
    id: "store_1",
    name: "Yewon Korean Restaurant 예원 한식당",
    address: "Jl. Purnawarman No.4A, Jakarta Selatan",
    rating: 4.6,
    reviews: 425,
  },
  {
    id: "store_2",
    name: "HALLA RESTAURANT HALAL",
    address: "Jl. Cipaku I No.14, Jakarta Selatan",
    rating: 4.7,
    reviews: 132,
  },
  {
    id: "store_3",
    name: "Leechadol 이차돌 세노파티",
    address: "Jl. Senayan No.29, Kebayoran Baru, Jakarta Selatan",
    rating: 4.9,
    reviews: 1478,
  },
  {
    id: "store_4",
    name: "청담가든",
    address: "Jl. Senopati No.43C, Senayan, Jakarta Selatan",
    rating: 4.6,
    reviews: 2244,
  },
  {
    id: "store_5",
    name: "토박",
    address: "Jl. Wolter Monginsidi No.30, Kebayoran Baru, Jakarta Selatan",
    rating: 4.5,
    reviews: 1411,
  },
  {
    id: "store_6",
    name: "무궁화 세노빠띠 본점",
    address: "Jl. Kemang Raya No.7, Kemang, Jakarta Selatan",
    rating: null,
    reviews: 0,
  }
];

/* ================= API ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OverlayType = "none" | "home" | "logout" | "store" | "sync";

export default function StoresPage() {
  const router = useRouter();

  const [overlay, setOverlay] = useState<OverlayType>("none");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [expandedAddress, setExpandedAddress] = useState<
    Record<string, boolean>
  >({});



  /* ================= 🔄 최신 리뷰 동기화 ================= */
  const syncReviews = async () => {
    setOverlay("sync");
    setSyncError(null);

    try {
      const res = await fetch(`${API_BASE}/stores/sync-reviews`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("sync_failed");
    } catch {
      setSyncError(
        "리뷰 동기화에 실패했습니다.\n잠시 후 다시 시도해주세요."
      );
    } finally {
      setOverlay("none");
    }
  };



  const overlayMessage =
    overlay === "none"
      ? ""
      : {
          home: "메인 화면으로 이동 중…",
          logout: "로그아웃 중…",
          store: "매장 상세 화면으로 이동 중…",
          sync: "최신 리뷰를 동기화하는 중…",
        }[overlay];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      <AppHeader variant="app" />

      {/* ⚠️ MOCK 배너 */}
      <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900">
        <div className="max-w-6xl mx-auto px-6 py-3 text-sm font-semibold">
          ⚠️ Google API 승인 전 단계입니다. 현재 화면은 <b>목데이터</b>입니다.
        </div>
      </div>

      {/* ================= Overlay ================= */}
      {overlay !== "none" && (
        <div className="fixed inset-x-0 top-[64px] bottom-0 z-40 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">{overlayMessage}</p>
        </div>
      )}

      {/* ================= Error Modal ================= */}
      {syncError && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 w-[90%] max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-3">동기화 실패</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {syncError}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setSyncError(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="mb-14 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold mb-3">
              내 매장 리뷰 분석
            </h1>
            <p className="text-gray-600 text-lg">
              Google 리뷰 기반 고객 인사이트
            </p>
          </div>

          <button
            onClick={syncReviews}
            disabled={overlay !== "none"}
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl
                       bg-gradient-to-r from-blue-600 to-indigo-600
                       text-white font-semibold shadow-lg"
          >
            <RefreshCcw
              className={`w-4 h-4 ${
                overlay === "sync" ? "animate-spin" : ""
              }`}
            />
            최신 리뷰 동기화
          </button>
        </div>

        {/* ================= Store Cards ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {MOCK_STORES.map((store) => {
            const hasRating = store.rating && store.rating > 0;

            return (
              <div
                key={store.id}
                className="group relative bg-white rounded-3xl p-8
                           shadow-md hover:shadow-2xl
                           transition transform hover:-translate-y-1
                           flex flex-col overflow-hidden"
              >
                {/* Hover Preview */}
                <div
                  className="absolute inset-0 bg-blue-600/90 text-white
                             opacity-0 group-hover:opacity-100
                             transition flex items-center justify-center
                             z-10 pointer-events-none"
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <Eye className="w-5 h-5" />
                    미리보기 · 클릭해서 분석
                  </div>
                </div>

                <div className="relative z-20">
                  <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold leading-tight break-words">
                        {store.name}
                      </h2>

                      <p
                        className={`mt-1 text-sm text-gray-500 ${
                          expandedAddress[store.id]
                            ? ""
                            : "line-clamp-2"
                        } md:line-clamp-none`}
                      >
                        <MapPin className="inline w-4 h-4 mr-1" />
                        {store.address}
                      </p>

                      {/* Mobile address toggle */}
                      <button
                        onClick={() =>
                          setExpandedAddress((prev) => ({
                            ...prev,
                            [store.id]: !prev[store.id],
                          }))
                        }
                        className="md:hidden text-xs text-blue-600 mt-1 font-semibold"
                      >
                        {expandedAddress[store.id]
                          ? "주소 접기"
                          : "주소 더보기"}
                      </button>
                    </div>

                    <span className="h-fit px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                      운영중
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2 font-semibold">
                      <Star className="w-5 h-5 text-yellow-400" />
                      {hasRating ? store.rating.toFixed(1) : "—"}
                    </div>

                    <span className="text-sm text-gray-500">
                      리뷰 {store.reviews.toLocaleString()}개
                    </span>

                    {!hasRating && (
                      <span className="text-xs text-yellow-600 font-semibold">
                        리뷰 수집 중
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setOverlay("store");
                      setTimeout(
                        () => router.push(`/stores/${store.id}`),
                        600
                      );
                    }}
                    className="mt-auto w-full py-4 rounded-2xl
                               bg-blue-600 text-white font-semibold
                               hover:bg-blue-700 transition"
                  >
                    이 매장 리뷰 분석하기
                    <ArrowRight className="inline ml-2 w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}