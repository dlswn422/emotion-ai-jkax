"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Store,
  MapPin,
  Star,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Calendar,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Users,
} from "lucide-react";

/* ================= MOCK ================= */
const MOCK_STORES: Record<string, any> = {
  store_1: {
    name: "인주네 파스타",
    address: "서울 강남구",
    category: "이탈리안 레스토랑",
    status: "OPEN",
    avg_rating: 4.6,
    review_count: 5,
    description:
      "강남에서 운영 중인 이탈리안 레스토랑으로, 신선한 재료와 정성스러운 파스타로 꾸준히 사랑받고 있습니다.",
    last_synced_at: "2026-01-16T12:40:00Z",
  },
  store_2: {
    name: "인주네 중식집",
    address: "서울 구로구",
    category: "중식",
    status: "OPEN",
    avg_rating: null,
    review_count: 0,
    description:
      "정갈한 중식 요리와 합리적인 가격으로 지역 주민들에게 사랑받는 중식당입니다.",
    last_synced_at: null,
  },
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= Header ================= */
function StoreHeader({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          매장 목록
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </header>
  );
}

/* ================= 메인 ================= */
export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();

  const decodedStoreId = useMemo(() => {
    if (!params.storeId) return "";
    return decodeURIComponent(params.storeId as string);
  }, [params.storeId]);

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<any | null>(null);

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ================= 로그인 + MOCK 로드 ================= */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const authRes = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const auth = await authRes.json();

        if (!auth.logged_in) {
          router.replace("/login");
          return;
        }

        const mock = MOCK_STORES[decodedStoreId];
        if (!mock) throw new Error("not_found");

        if (!cancelled) setStore(mock);
      } catch {
        if (!cancelled)
          setError(
            "매장 정보를 불러오는 데 실패했습니다.\n잠시 후 다시 시도해주세요."
          );
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [decodedStoreId, router]);

  const handleAnalyze = () => {
    if (!fromDate || !toDate) return;

    setShowAnalyzeModal(false);
    router.push(
      `/cx-dashboard?storeId=${encodeURIComponent(
        decodedStoreId
      )}&from=${fromDate}&to=${toDate}`
    );
  };

  /* ================= Render ================= */
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <StoreHeader
        onBack={() => router.push("/stores")}
        onLogout={() => router.replace("/login")}
      />

      {/* 로딩 */}
      {checking && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* 실패 */}
      {!checking && error && (
        <div className="flex-1 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
      )}

      {/* 정상 */}
      {!checking && !error && store && (() => {
        const hasReviews = store.review_count > 0;

        return (
          <section className="max-w-6xl mx-auto px-6 py-16 space-y-14 flex-1">
            {/* HERO */}
            <section className="bg-white rounded-3xl p-10 shadow-sm">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Store className="w-8 h-8 text-blue-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-extrabold">{store.name}</h1>
                    {store.status === "OPEN" && (
                      <span className="flex items-center gap-1 text-sm text-green-600 font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        운영중
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mb-2">
                    {store.category} · {store.address}
                  </p>

                  <p className="text-gray-600 mb-4">
                    {store.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Info className="w-4 h-4" />
                    Google Business Profile 기준 정보
                  </div>
                </div>
              </div>
            </section>

            {/* METRICS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Metric
                icon={<Star className="w-6 h-6 text-yellow-400" />}
                label="평균 평점"
                value={hasReviews ? store.avg_rating : "—"}
                sub={hasReviews ? "Google 리뷰 기준 평균 평점" : "리뷰 수집 후 평점이 표시됩니다"}
              />
              <Metric
                icon={<MessageSquare className="w-6 h-6 text-green-500" />}
                label="리뷰 수"
                value={`${store.review_count}개`}
                sub={hasReviews ? "분석 가능한 리뷰 데이터" : "Google 리뷰 동기화 대기 중"}
              />
              <Metric
                icon={<Sparkles className="w-6 h-6 text-purple-500" />}
                label="분석 항목"
                value="감성 · 키워드 · 요약"
                sub={hasReviews ? "감성 · 키워드 · 요약 분석 제공" : "리뷰 수집 후 분석 기능이 활성화됩니다"}
              />
            </section>

            {/* CTA */}
            <section className="bg-white rounded-3xl p-12 shadow-md text-center">
              {!hasReviews ? (
                <>
                  <h2 className="text-2xl font-extrabold mb-3">
                    아직 분석할 리뷰가 없습니다
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Google 리뷰가 수집되면
                    <br />
                    고객 인사이트 분석을 시작할 수 있습니다
                  </p>

                  <button
                    disabled
                    className="px-10 py-4 rounded-2xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed"
                  >
                    리뷰 분석 준비 중
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-extrabold mb-3">
                    이 매장의 리뷰를 분석해보세요
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Google 리뷰 기반 고객 인사이트 제공
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setShowAnalyzeModal(true)}
                      className="px-12 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700"
                    >
                      리뷰 분석 시작
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/stores/${encodeURIComponent(
                            decodedStoreId
                          )}/customers`
                        )
                      }
                      className="px-8 py-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 flex items-center gap-2 justify-center"
                    >
                      <Users className="w-5 h-5" />
                      고객 분석
                    </button>
                  </div>
                </>
              )}
            </section>
          </section>
        );
      })()}

      {/* 분석 기간 모달 */}
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
              className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-semibold"
            >
              취소
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!fromDate || !toDate}
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              분석 시작
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ================= Components ================= */

function Metric({ icon, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-3">
        {icon}
        <span className="text-gray-500 font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold mb-1">{value}</div>
      <div className="text-sm text-gray-400">{sub}</div>
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