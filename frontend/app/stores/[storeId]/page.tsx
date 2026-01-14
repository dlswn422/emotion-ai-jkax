"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Store,
  MapPin,
  Star,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  LogOut,
  Loader2,
} from "lucide-react";

/* ================= MOCK ================= */
const MOCK_STORES: Record<string, any> = {
  store_1: {
    name: "인주네 파스타",
    address: "서울 강남구",
    rating: 4.6,
    reviews: 128,
    description:
      "신선한 재료와 정성스러운 파스타로 꾸준히 사랑받는 이탈리안 레스토랑입니다.",
  },
  store_2: {
    name: "문인주 카페",
    address: "서울 마포구",
    rating: 4.3,
    reviews: 76,
    description:
      "조용한 분위기에서 커피와 디저트를 즐길 수 있는 감성 카페입니다.",
  },
};

type SyncResult = "idle" | "success" | "error";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function StoreDetailPage() {
  const router = useRouter();
  const { storeId } = useParams();
  const store = MOCK_STORES[storeId as string];

  const [checking, setChecking] = useState(true);
  const [navigating, setNavigating] = useState(false);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [insertedCount, setInsertedCount] = useState<number>(0);

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setChecking(false);
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

  /* ================= 리뷰 최신화 ================= */
  const handleSyncReviews = async () => {
    try {
      setSyncing(true);
      setSyncResult("idle");
      setErrorMessage(null);

      const res = await fetch(`${API_BASE}/reviews/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });

      if (!res.ok) throw new Error("리뷰 최신화 중 오류가 발생했습니다.");

      const data = await res.json();
      setInsertedCount(data.inserted ?? 0);
      setSyncResult("success");
    } catch (e: any) {
      setErrorMessage(e.message);
      setSyncResult("error");
    } finally {
      setSyncing(false);
    }
  };

  /* ================= 리뷰 분석 이동 (⭐ 로딩 포함) ================= */
  const handleAnalyze = () => {
    if (!fromDate || !toDate) return;

    setNavigating(true);          // ⭐ 여기!
    setShowAnalyzeModal(false);   // 모달 닫기

    router.push(
      `/cx-dashboard?storeId=${storeId}&from=${fromDate}&to=${toDate}`
    );
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        로그인 상태 확인 중…
      </main>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        매장 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      {/* ================= 페이지 이동 로딩 ================= */}
      {navigating && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">
            분석 화면으로 이동 중…
          </p>
        </div>
      )}

      {/* ================= Header ================= */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/stores")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            매장 목록
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500 transition"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 space-y-16">
        {/* Hero */}
        <section className="bg-white rounded-3xl p-10 shadow-lg">
          <div className="flex gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Store className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold mb-1">{store.name}</h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <MapPin className="w-4 h-4" />
                {store.address}
              </div>
              <p className="text-gray-600">{store.description}</p>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Metric icon={<Star className="w-6 h-6 text-yellow-400" />} label="평균 평점" value={store.rating} />
          <Metric icon={<MessageSquare className="w-6 h-6 text-green-500" />} label="리뷰 수" value={`${store.reviews}개`} />
          <Metric icon={<Sparkles className="w-6 h-6 text-purple-500" />} label="분석 항목" value="감성 · 키워드 · 요약" />
        </section>

        {/* CTA */}
        <section className="bg-white rounded-3xl p-12 shadow-lg text-center">
          <h2 className="text-2xl font-extrabold mb-3">
            이 매장의 리뷰를 분석해보세요
          </h2>
          <p className="text-gray-600 mb-8">
            Google 리뷰를 기반으로 고객 인사이트를 도출합니다
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-8 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              리뷰 최신화
            </button>

            <button
              onClick={() => setShowAnalyzeModal(true)}
              className="px-12 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
            >
              리뷰 분석 시작
            </button>

            <button
              onClick={() => {
                setNavigating(true);
                router.push(`/stores/${storeId}/customers`);
              }}
              className="px-8 py-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition"
            >
              고객 분석
            </button>
          </div>
        </section>
      </section>

      {/* ================= 분석 기간 모달 ================= */}
      {showAnalyzeModal && (
        <Modal onClose={() => setShowAnalyzeModal(false)}>
          <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            분석 기간 선택
          </h3>

          <div className="space-y-4 mb-8">
            <InputDate label="시작일" value={fromDate} onChange={setFromDate} />
            <InputDate label="종료일" value={toDate} onChange={setToDate} />
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowAnalyzeModal(false)}
              className="text-slate-500 font-semibold hover:text-slate-700 transition"
            >
              취소
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!fromDate || !toDate}
              className="px-6 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
            >
              분석 시작
            </button>
          </div>
        </Modal>
      )}

      {/* ================= 리뷰 최신화 모달 ================= */}
      {showSyncModal && (
        <Modal onClose={() => setShowSyncModal(false)}>
          {syncing ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="font-semibold">동기화 중입니다…</p>
            </div>
          ) : syncResult === "success" ? (
            <div className="text-center py-10">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-4" />
              <p className="font-bold text-lg mb-2">리뷰 최신화 완료</p>
              <p className="text-gray-600 mb-6">
                신규 리뷰 {insertedCount}건이 저장되었습니다.
              </p>
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
              >
                확인
              </button>
            </div>
          ) : syncResult === "error" ? (
            <div className="text-center py-10">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className="font-bold text-lg mb-2">리뷰 최신화 실패</p>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
              >
                닫기
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-extrabold mb-3">
                Google 리뷰 최신화
              </h3>
              <p className="text-gray-600 mb-8">
                최신 Google 리뷰를 불러옵니다.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-slate-500 font-semibold hover:text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleSyncReviews}
                  className="px-6 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
                >
                  확인
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}

/* ================= 공통 컴포넌트 ================= */

function Metric({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition">
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <span className="text-gray-500 font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function Modal({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}

function InputDate({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-2"
      />
    </div>
  );
}