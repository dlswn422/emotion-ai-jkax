"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Star,
  MessageSquare,
  Send,
  AlertTriangle,
} from "lucide-react";

/* ================= API ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= MOCK ================= */
const MOCK_REVIEWS = [
  {
    id: "r1",
    author_name: "홍길동",
    rating: 2,
    comment: "음식이 너무 늦게 나왔어요.",
    created_at: "2026-01-05",
    replied: false,
  },
  {
    id: "r2",
    author_name: "김인주",
    rating: 5,
    comment: "정말 맛있고 친절했어요!",
    created_at: "2026-01-08",
    replied: true,
    reply: "소중한 리뷰 감사합니다 😊",
  },
];

type OverlayType = "none" | "back" | "logout";

export default function ReviewManagementPage() {
  const { storeId } = useParams();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [overlay, setOverlay] = useState<OverlayType>("none");
  const [reviews, setReviews] = useState<any[]>([]);

  /* ================= 로그인 가드 ================= */
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const auth = await res.json();
        if (!auth.logged_in) {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    checkLogin();
  }, [router]);

  /* ================= 리뷰 로드 (MOCK) ================= */
  useEffect(() => {
    if (!checking) {
      setReviews(MOCK_REVIEWS);
    }
  }, [checking]);

  /* ================= 로그아웃 ================= */
  const handleLogout = async () => {
    setOverlay("logout");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setTimeout(() => router.replace("/login"), 600);
    }
  };

  /* ================= 초기 로딩 ================= */
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  const overlayMessage =
    overlay === "back"
      ? "매장 상세 화면으로 이동 중…"
      : overlay === "logout"
      ? "로그아웃 중…"
      : "";

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* ================= Overlay ================= */}
      {overlay !== "none" && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-semibold text-gray-600">
            {overlayMessage}
          </p>
        </div>
      )}

      {/* ================= Header ================= */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              setOverlay("back");
              setTimeout(() => router.push(`/stores/${storeId}`), 600);
            }}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            매장 상세
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

      {/* ================= Content ================= */}
      <section className="max-w-5xl mx-auto px-6 py-20 space-y-12">
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            리뷰 관리
          </h1>
          <p className="text-gray-500 mt-3">
            고객의 목소리에 직접 답변하고 신뢰를 쌓아보세요
          </p>
        </div>

        {/* ================= Empty ================= */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 shadow-md flex flex-col items-center">
            <AlertTriangle className="w-12 h-12 text-blue-600 mb-4" />
            <p className="text-lg font-semibold">
              아직 등록된 리뷰가 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`rounded-3xl p-8 shadow-md transition
                  ${
                    r.replied
                      ? "bg-white"
                      : "bg-blue-50 border border-blue-100"
                  }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg text-gray-900">
                      {r.author_name}
                    </p>

                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < r.rating
                              ? "text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-500">
                        {r.created_at}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-bold
                      ${
                        r.replied
                          ? "bg-green-100 text-green-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                  >
                    {r.replied ? "답변 완료" : "답변 필요"}
                  </span>
                </div>

                {/* Review */}
                <p className="text-gray-800 text-base leading-relaxed mb-5">
                  {r.comment}
                </p>

                {/* Reply */}
                {r.replied ? (
                  <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 flex gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5" />
                    {r.reply}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      placeholder="정중한 답변을 작성해보세요"
                      className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
