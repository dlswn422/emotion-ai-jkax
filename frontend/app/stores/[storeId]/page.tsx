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
  PlayCircle,
  RefreshCw,
  Users,
  AlertTriangle,
  CheckCircle,
  Calendar,
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

export default function StoreDetailPage() {
  const router = useRouter();
  const { storeId } = useParams();
  const store = MOCK_STORES[storeId as string];

  /* ================= 상태 ================= */
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
    const checkLogin = async () => {
      try {
        const res = await fetch("http://localhost:8000/auth/status", {
          credentials: "include",
        });
        const data = await res.json();
        if (!data.logged_in) router.replace("/login");
      } catch {
        router.replace("/login");
      }
    };
    checkLogin();
  }, [router]);

  /* ================= 리뷰 수동 최신화 ================= */
  const handleSyncReviews = async () => {
    try {
      setSyncing(true);
      setSyncResult("idle");
      setErrorMessage(null);

      const res = await fetch("http://localhost:8000/reviews/sync", {
        method: "POST",
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

  /* ================= 리뷰 분석 시작 ================= */
  const handleAnalyze = () => {
    if (!fromDate || !toDate) return;

    router.push(
      `/cx-dashboard?storeId=${storeId}&from=${fromDate}&to=${toDate}`
    );
  };

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        매장 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="max-w-5xl mx-auto space-y-14">
        {/* ================= Top ================= */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">🏪 매장 상세</h1>
          <button
            onClick={() => router.push("/stores")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            매장 목록으로
          </button>
        </div>

        {/* ================= Hero ================= */}
        <section className="bg-white rounded-3xl p-10 shadow-lg">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Store className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{store.name}</h2>
              <div className="flex items-center gap-2 text-gray-500 mb-3">
                <MapPin className="w-4 h-4" />
                {store.address}
              </div>
              <p className="text-gray-600 leading-relaxed">
                {store.description}
              </p>
            </div>
          </div>
        </section>

        {/* ================= Metrics ================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Metric
            icon={<Star className="w-6 h-6 text-yellow-400" />}
            label="평균 평점"
            value={store.rating}
          />
          <Metric
            icon={<MessageSquare className="w-6 h-6 text-green-500" />}
            label="리뷰 수"
            value={`${store.reviews}개`}
          />
          <Metric
            icon={<Sparkles className="w-6 h-6 text-purple-500" />}
            label="분석 항목"
            value="감성 · 키워드 · 요약"
          />
        </section>

        {/* ================= CTA ================= */}
        <section className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-12 text-center shadow-lg">
          <h3 className="text-2xl font-extrabold mb-4">
            이 매장의 리뷰를 분석해보세요
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setSyncResult("idle");
                setErrorMessage(null);
                setInsertedCount(0);
                setShowSyncModal(true);
              }}
              className="px-8 py-4 rounded-2xl border font-semibold"
            >
              리뷰 최신화
            </button>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setShowAnalyzeModal(true);
              }}
              className="px-12 py-4 rounded-2xl bg-blue-600 text-white font-semibold"
            >
              리뷰 분석 시작
            </button>

            <button
              onClick={() => router.push(`/stores/${storeId}/customers`)}
              className="px-8 py-4 rounded-2xl border border-purple-300 text-purple-700 font-semibold"
            >
              고객 분석
            </button>
          </div>
        </section>
      </div>

      {/* ================= 리뷰 분석 기간 팝업 ================= */}
      {showAnalyzeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAnalyzeModal(false)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8">
            <h3 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              분석 기간 선택
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAnalyzeModal(false)}
                className="px-5 py-2 text-gray-600 font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!fromDate || !toDate}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                분석 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 리뷰 최신화 모달 ================= */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8">
            {syncing && (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="font-semibold">동기화 중입니다…</p>
              </div>
            )}

            {!syncing && syncResult === "idle" && (
              <>
                <h3 className="text-xl font-extrabold mb-4">
                  Google 리뷰 최신화
                </h3>
                <p className="text-gray-600 mb-6">
                  Google 리뷰를 최신화합니다.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="px-5 py-2 text-gray-600 font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSyncReviews}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold"
                  >
                    확인
                  </button>
                </div>
              </>
            )}

            {syncResult === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-4" />
                <p className="font-bold text-lg mb-2">리뷰 최신화 완료</p>
                <p className="text-gray-600 mb-6">
                  신규 리뷰 {insertedCount}건이 저장되었습니다.
                </p>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold"
                >
                  확인
                </button>
              </div>
            )}

            {syncResult === "error" && (
              <div className="text-center py-8">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <p className="font-bold text-lg mb-2">리뷰 최신화 실패</p>
                <p className="text-gray-600 mb-6">{errorMessage}</p>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-6 py-2 bg-gray-700 text-white rounded-xl font-semibold"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= Metric ================= */
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-md">
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <span className="text-gray-500 font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}