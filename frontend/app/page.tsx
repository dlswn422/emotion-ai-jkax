"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  MapPin,
  LogOut,
  Loader2,
} from "lucide-react";

/* ✅ API BASE */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OverlayType = "none" | "stores" | "upload" | "logout";

export default function Home() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [overlay, setOverlay] = useState<OverlayType>("none");

  /* =========================
     로그인 + 연동 상태 체크
  ========================= */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1️⃣ 로그인 상태
        const authRes = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const authData = await authRes.json();

        if (!authData.logged_in) {
          router.replace("/login");
          return;
        }

        // 2️⃣ Google 연동 여부
        const googleRes = await fetch(
          `${API_BASE}/integrations/google/status`,
          { credentials: "include" }
        );
        const googleData = await googleRes.json();

        if (!cancelled) {
          setGoogleConnected(googleData.connected);
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

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* =========================
     초기 로딩
  ========================= */
  if (checking || googleConnected === null) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100
                      flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-600">
            상태 확인 중…
          </p>
        </div>
      </main>
    );
  }


  /* =========================
     로그아웃 (로딩 포함)
  ========================= */
  const handleLogout = async () => {
    setOverlay("logout");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setTimeout(() => {
        router.replace("/login");
      }, 600);
    }
  };

  /* =========================
     설문 데이터 분석 이동
  ========================= */
  const handleUploadClick = () => {
    setOverlay("upload");
    setTimeout(() => {
      router.push("/upload");
    }, 600);
  };

  /* =========================
     Google 리뷰 분석 이동
  ========================= */
  const handleGoogleReviewClick = () => {
    if (!googleConnected) {
      setShowConnectModal(true);
    } else {
      setOverlay("stores");
      setTimeout(() => {
        router.push("/stores");
      }, 600);
    }
  };

  /* =========================
     오버레이 메시지
  ========================= */
  const overlayMessage =
    overlay === "none"
      ? ""
      : {
          stores: "매장 목록으로 이동 중…",
          upload: "설문 데이터 업로드 화면으로 이동 중…",
          logout: "로그아웃 중…",
        }[overlay];

  /* =========================
     UI
  ========================= */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      {/* 공통 로딩 오버레이 */}
      {overlay !== "none" && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur
                        flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">
            {overlayMessage}
          </p>
        </div>
      )}

      {/* Google 연동 모달 */}
      {showConnectModal && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-xl font-extrabold mb-3">
              Google 계정 연동 필요
            </h2>
            <p className="text-gray-600 mb-8">
              Google 리뷰를 분석하려면
              <br />
              먼저 Google 비즈니스 계정을 연동해야 합니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border text-gray-500 font-semibold hover:bg-gray-50"
              >
                취소
              </button>

              <button
                onClick={() => {
                  window.location.href =
                    `${API_BASE}/connect/google-business`;
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                연동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-extrabold tracking-tight text-blue-600">
            Review Insight
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500 transition"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-8">
          리뷰 데이터를
          <br />
          <span className="text-blue-600">실행 가능한 인사이트</span>로
        </h1>

        <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-16">
          설문 데이터 또는 Google 리뷰를 기반으로
          <br />
          AI가 고객 경험을 자동 분석합니다.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <button
            onClick={handleUploadClick}
            className="px-10 py-5 rounded-2xl bg-blue-600 text-white text-lg font-semibold shadow-xl hover:bg-blue-700 transition"
          >
            <UploadCloud className="inline w-6 h-6 mr-2" />
            설문 데이터 분석
          </button>

          <button
            onClick={handleGoogleReviewClick}
            className="px-10 py-5 rounded-2xl bg-white text-blue-600 text-lg font-semibold border-2 border-blue-600 shadow-lg hover:bg-blue-50 transition"
          >
            <MapPin className="inline w-6 h-6 mr-2" />
            Google 리뷰 분석
          </button>
        </div>
      </section>
    </main>
  );
}