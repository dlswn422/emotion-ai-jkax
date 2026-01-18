"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Store,
    Star,
    MessageSquare,
    Sparkles,
    Calendar,
    LogOut,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Info,
    Users,
    Home,
} from "lucide-react";

/* ================= MOCK ================= */
const MOCK_STORES: Record<string, any> = {
    store_1: {
        name: "인주네 파스타",
        address: "서울 강남구",
        category: "이탈리안 레스토랑",
        status: "OPEN",
        avg_rating: 4.6,
        review_count: 4,
        description:
            "강남에서 운영 중인 이탈리안 레스토랑으로, 신선한 재료와 정성스러운 파스타로 꾸준히 사랑받고 있습니다.",
        last_synced_at: "2026-01-16T12:40:00Z",
    },
    store_2: {
        name: "인주네 중식집",
        address: "서울 구로구",
        category: "중식",
        status: "OPEN",
        avg_rating: 0,
        review_count: 0,
        description:
            "정갈한 중식 요리와 합리적인 가격으로 지역 주민들에게 사랑받는 중식당입니다.",
        last_synced_at: null,
    },
};

/* ================= API ================= */
const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= Date Utils ================= */
function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
}

function getDateRange(
    type: "7d" | "30d" | "3m" | "6m" | "all"
): { from: string; to: string } {
    const today = new Date();
    const end = formatDate(today);

    if (type === "all") {
        return { from: "2000-01-01", to: end };
    }

    const start = new Date(today);

    switch (type) {
        case "7d":
            start.setDate(today.getDate() - 7);
            break;
        case "30d":
            start.setDate(today.getDate() - 30);
            break;
        case "3m":
            start.setMonth(today.getMonth() - 3);
            break;
        case "6m":
            start.setMonth(today.getMonth() - 6);
            break;
    }

    return { from: formatDate(start), to: end };
}

/* ================= Main ================= */
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

    const [analyzing, setAnalyzing] = useState(false);
    const [navigatingCustomers, setNavigatingCustomers] = useState(false);

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

    /* ✅ 모달 열릴 때 기본값: 최근 6개월 */
    useEffect(() => {
        if (!showAnalyzeModal) return;
        const { from, to } = getDateRange("6m");
        setFromDate(from);
        setToDate(to);
    }, [showAnalyzeModal]);

    /* ================= 로그아웃 ================= */
    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } finally {
            sessionStorage.setItem("just_logged_out", "1");
            router.replace("/login");
        }
    };

    const handleAnalyze = () => {
        if (!fromDate || !toDate || analyzing) return;

        setAnalyzing(true);
        setShowAnalyzeModal(false);

        setTimeout(() => {
            router.push(
                `/cx-dashboard?storeId=${encodeURIComponent(
                    decodedStoreId
                )}&from=${fromDate}&to=${toDate}`
            );
        }, 400);
    };

    /* ================= Render ================= */
    return (
        <main className="min-h-screen flex flex-col bg-slate-50 relative">
            {/* ================= 🔧 FIXED HEADER (공통 디자인) ================= */}
            <header className="sticky top-0 z-40 bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
                    {/* LEFT */}
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push("/stores")}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"
                        >
                            <Home className="w-4 h-4" />
                            메인으로
                        </button>
                    </div>

                    <div />

                    {/* RIGHT */}
                    <div className="flex items-center justify-end">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-500"
                        >
                            <LogOut className="w-4 h-4" />
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* 고객 분석 이동 오버레이 */}
            {navigatingCustomers && (
                <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                    <p className="font-semibold text-gray-700">
                        고객 분석 화면으로 이동 중…
                    </p>
                </div>
            )}

            {/* 리뷰 분석 이동 오버레이 */}
            {analyzing && (
                <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="font-semibold text-gray-700">
                        AI 분석 화면으로 이동 중…
                    </p>
                </div>
            )}

            {checking && (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            )}

            {!checking && error && (
                <div className="flex-1 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-10 h-10" />
                </div>
            )}

            {!checking && !error && store && (() => {
                const hasReviews = store.review_count > 0;

                return (
                    <section className="max-w-6xl mx-auto px-6 py-16 space-y-16 flex-1">
                        {/* STORE OVERVIEW */}
                        <section className="relative bg-white rounded-3xl p-10 shadow-sm">
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 rounded-l-3xl" />
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

                                    <p className="text-sm text-gray-500 mb-3">
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

                        {/* KPI */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Metric
                                icon={<Star className="w-6 h-6 text-yellow-400" />}
                                label="평균 평점"
                                value={hasReviews ? store.avg_rating : "—"}
                                sub={
                                    hasReviews
                                        ? "Google 리뷰 기준"
                                        : "리뷰 수집 후 표시됩니다"
                                }
                            />
                            <Metric
                                icon={<MessageSquare className="w-6 h-6 text-green-500" />}
                                label="리뷰 수"
                                value={`${store.review_count}개`}
                                sub={
                                    hasReviews
                                        ? "분석 가능한 데이터"
                                        : "리뷰 동기화 대기 중"
                                }
                            />
                            <Metric
                                icon={<Sparkles className="w-6 h-6 text-purple-500" />}
                                label="AI 분석 항목"
                                value="감성 · 키워드 · 요약"
                                sub="CX 인사이트 자동 분석"
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
                                        리뷰가 수집되면 고객 인사이트 분석을 시작할 수 있습니다
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
                                        이 매장의 고객 경험을 분석해보세요
                                    </h2>
                                    <p className="text-gray-600 mb-8">
                                        Google 리뷰 기반 CX 인사이트 제공
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        {/* 리뷰 관리 */}
                                        {/* <button
                                 onClick={() =>
                                   router.push(
                                     `/stores/${encodeURIComponent(
                                       decodedStoreId
                                     )}/reviews`
                                   )
                                 }
                                 className="px-8 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 flex items-center gap-2 justify-center"
                               >
                                 <MessageSquare className="w-5 h-5" />
                                 리뷰 관리
                               </button> */}

                                        {/* 리뷰 분석 */}
                                        <button
                                            onClick={() => setShowAnalyzeModal(true)}
                                            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700"
                                        >
                                            리뷰 분석 시작
                                        </button>

                                        {/* 고객 분석 */}
                                        <button
                                            onClick={() => {
                                                setNavigatingCustomers(true);
                                                setTimeout(() => {
                                                    router.push(
                                                        `/stores/${encodeURIComponent(
                                                            decodedStoreId
                                                        )}/customers`
                                                    );
                                                }, 600);
                                            }}
                                            className="px-8 py-4 rounded-2xl border border-purple-200 bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 flex items-center gap-2 justify-center"
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

            {/* ================= 분석 기간 모달 ================= */}
            {showAnalyzeModal && (
                <Modal onClose={() => setShowAnalyzeModal(false)}>
                    <h3 className="text-xl font-extrabold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        분석 기간 선택
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <QuickButton label="최근 7일" onClick={() => {
                            const r = getDateRange("7d");
                            setFromDate(r.from);
                            setToDate(r.to);
                        }} />
                        <QuickButton label="최근 30일" onClick={() => {
                            const r = getDateRange("30d");
                            setFromDate(r.from);
                            setToDate(r.to);
                        }} />
                        <QuickButton label="최근 3개월" onClick={() => {
                            const r = getDateRange("3m");
                            setFromDate(r.from);
                            setToDate(r.to);
                        }} />
                        <QuickButton label="최근 6개월" onClick={() => {
                            const r = getDateRange("6m");
                            setFromDate(r.from);
                            setToDate(r.to);
                        }} />
                        <QuickButton label="전체" onClick={() => {
                            const r = getDateRange("all");
                            setFromDate(r.from);
                            setToDate(r.to);
                        }} />
                    </div>

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
                            disabled={!fromDate || !toDate || analyzing}
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
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    {icon}
                </div>
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

function QuickButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 rounded-xl border border-gray-200
                            bg-gray-50 text-sm font-semibold text-gray-700
                            hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600
                            transition"
        >
            {label}
        </button>
    );
}

