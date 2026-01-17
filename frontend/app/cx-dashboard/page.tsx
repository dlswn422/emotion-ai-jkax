"use client";

/* ✅ prerender / SSG 완전 차단 */
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Sparkles,
  ShieldCheck,
  Star,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  Line,
} from "recharts";

/* ✅ API BASE */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= ENTRY ================= */
export default function CxDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <CxDashboardInner />
    </Suspense>
  );
}

/* ================= REAL PAGE ================= */
function CxDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const storeId = searchParams.get("storeId");

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [navigatingBack, setNavigatingBack] = useState(false);

  /* ================= 로그인 가드 ================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const auth = await res.json();

        if (!cancelled && !auth.logged_in) {
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

  /* ================= CX 분석 API ================= */
  useEffect(() => {
    if (!storeId) return;

    let cancelled = false;

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ store_id: storeId });
        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const res = await fetch(
          `${API_BASE}/analysis/cx-analysis?${params.toString()}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const json = await res.json();

        if (json?.total === 0) {
          setAnalysis(json);
          return;
        }

        if (!json?.executive_summary?.summary) {
          throw new Error("분석 결과 형식이 올바르지 않습니다.");
        }

        if (!cancelled) setAnalysis(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "CX 분석 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalysis();
    return () => {
      cancelled = true;
    };
  }, [storeId, from, to]);

  /* ================= 상태 처리 ================= */

  if (checking || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  /* 🔴 리뷰 없음 */
  if (analysis?.total === 0) {
  const periodLabel =
    from && to ? `${from} ~ ${to}` : "선택된 기간";

  return (
    <main className="relative min-h-screen bg-gray-100 px-6 py-12">
      {/* 상단 헤더는 그대로 유지 */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl px-12 py-10 shadow-md">
        {/* HEADER */}
        <section className="border-b pb-6 mb-16">
          <span className="text-xs tracking-widest font-bold text-blue-600">
            CX STRATEGIC REPORT
          </span>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
            고객경험(CX) 분석 보고서
          </h1>

          <div className="text-sm font-semibold text-gray-500 mt-3 flex justify-between">
            <span>Store ID: {storeId}</span>
            <span>Analysis Period: {periodLabel}</span>
          </div>
        </section>

        {/* EMPTY STATE */}
        <section className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-blue-500" />
          </div>

          <h2 className="text-xl font-extrabold text-gray-800 mb-2">
            아직 분석할 리뷰가 없습니다
          </h2>

          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-md">
            선택한 기간에 수집된 리뷰가 없어<br />
            CX 분석을 진행할 수 없습니다.
          </p>

          <div className="mt-6 text-xs text-gray-400 text-center">
            · 기간을 늘려보세요<br />
            · 리뷰 수집이 아직 완료되지 않았을 수 있어요
          </div>
        </section>
      </div>
    </main>
  );
}


  /* 🔴 에러 */
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm font-semibold text-red-600">{error}</p>
      </main>
    );
  }

  const periodLabel =
    from && to ? `${from} ~ ${to}` : "전체 기간";

  return (
    <main className="relative min-h-screen bg-gray-100 px-6 py-12">
      {(downloading || navigatingBack) && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur
                        flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            {downloading ? "PDF 생성 중…" : "이전 화면으로 이동 중…"}
          </p>
        </div>
      )}

      {/* ================= ACTIONS ================= */}
      <div className="max-w-6xl mx-auto flex justify-between mb-8 print:hidden">
        <button
          onClick={() => {
            setNavigatingBack(true);
            setTimeout(() => router.back(), 400);
          }}
          className="flex items-center gap-2 text-sm font-semibold
                     text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <button
          onClick={() => {
            setDownloading(true);
            setTimeout(() => {
              window.print();
              setDownloading(false);
            }, 400);
          }}
          className="flex items-center gap-2 px-4 py-2
                     bg-slate-900 hover:bg-slate-800
                     text-white text-sm font-semibold rounded-lg
                     shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          PDF 다운로드
        </button>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl px-12 py-10 space-y-16 shadow-md">
        {/* ================= HEADER ================= */}
        <section className="border-b pb-6">
          <span className="text-xs tracking-widest font-bold text-blue-600">
            CX STRATEGIC REPORT
          </span>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
            고객경험(CX) 분석 보고서
          </h1>

          <div className="text-sm font-semibold text-gray-500 mt-3 flex justify-between">
            <span>Store ID: {storeId}</span>
            <span>Analysis Period: {periodLabel}</span>
          </div>
        </section>

        {/* ================= EXECUTIVE SUMMARY ================= */}
        <section className="relative bg-blue-50 rounded-xl px-8 py-6 pl-12">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 rounded-l-xl" />
          <h2 className="text-lg font-extrabold text-blue-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Executive Summary
          </h2>
          <p className="text-sm leading-relaxed font-medium text-gray-700">
            “{analysis.executive_summary.summary}”
          </p>
        </section>

        {/* ================= KPI ================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <OverallRatingCard rating={analysis.rating} />
          <SentimentCard sentiment={analysis.kpi.sentiment} />
          <NpsCard nps={analysis.kpi.nps} />
        </section>

        {/* ================= SCORE TREND ================= */}
        <section className="mt-10">
          <ScoreTrendCard />
        </section>

        {/* ================= DRIVERS / IMPROVEMENTS ================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ProgressBlock
            title="🔥 Key Drivers of Satisfaction"
            items={analysis.drivers_of_satisfaction}
            color="blue"
          />
          <ProgressBlock
            title="🛠 Areas for Improvement"
            items={analysis.areas_for_improvement}
            color="gray"
          />
        </section>

        {/* ================= INSIGHTS / ACTION ================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <InsightsCard insights={analysis.strategic_insights} />
          <RiskCard plan={analysis.risk_and_action_plan} />
        </section>

        <footer className="border-t pt-6 text-xs font-semibold text-gray-400 flex justify-between">
          <span>CONFIDENTIAL – FOR INTERNAL USE ONLY</span>
          <span>Generated by CX AI Analyst System © 2026</span>
        </footer>
      </div>
    </main>
  );
}

/* ================= Shared Components (UI 유지) ================= */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-gray-200 p-6 shadow-sm bg-white h-full">
      <div className="absolute left-0 top-0 h-full w-1 bg-gray-100 rounded-l-xl" />
      <div className="pl-2">{children}</div>
    </div>
  );
}

function OverallRatingCard({ rating }: { rating: number }) {
  return (
    <Card>
      <h3 className="text-lg font-extrabold text-gray-800 mb-4">
        OVERALL RATING
      </h3>
      <div className="flex items-end gap-3">
        <div className="text-5xl font-extrabold text-blue-600">
          {rating}
        </div>
        <div className="text-lg font-semibold text-gray-400">/ 5.0</div>
      </div>
      <div className="flex gap-1 mt-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-400" />
        ))}
      </div>
    </Card>
  );
}

function SentimentCard({ sentiment }: any) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const p = sentiment.positive / 100;

  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-4">
        SENTIMENT ANALYSIS
      </h3>
      <svg width="160" height="160" className="mx-auto">
        <circle cx="80" cy="80" r={r} stroke="#e5e7eb" strokeWidth="12" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#22c55e"
          strokeWidth="12"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xl font-extrabold fill-gray-700"
        >
          {sentiment.positive}%
        </text>
      </svg>
    </Card>
  );
}

function NpsCard({ nps }: { nps: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const p = nps / 10;

  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-4">
        RECOMMENDATION (NPS)
      </h3>
      <svg width="160" height="160" className="mx-auto">
        <circle cx="80" cy="80" r={r} stroke="#e5e7eb" strokeWidth="12" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#2563eb"
          strokeWidth="12"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xl font-extrabold fill-gray-700"
        >
          {nps}
        </text>
      </svg>
    </Card>
  );
}

function ProgressBlock({ title, items, color }: any) {
  const bar = color === "blue" ? "bg-blue-600" : "bg-gray-500";
  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-5">{title}</h3>
      {items.map((i: any) => (
        <div key={i.label} className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{i.label}</span>
            <span>{i.value}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full">
            <div
              className={`h-2.5 rounded-full ${bar}`}
              style={{ width: `${i.value}%` }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

function InsightsCard({ insights }: any) {
  return (
    <Card>
      <h3 className="text-lg font-extrabold text-blue-600 mb-4">
        AI Strategic Insights
      </h3>
      {insights.map((i: any, idx: number) => (
        <div key={idx} className="mb-4">
          <p className="font-semibold">{i.title}</p>
          <p className="text-sm text-gray-600">{i.description}</p>
        </div>
      ))}
    </Card>
  );
}

function RiskCard({ plan }: any) {
  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-green-600" />
        Action Plan
      </h3>
      {plan.actions.map((a: any, idx: number) => (
        <div key={idx} className="mb-3">
          <p className="font-semibold">{a.area}</p>
          <p className="text-sm text-gray-600">{a.action}</p>
        </div>
      ))}
    </Card>
  );
}

function ScoreTrendCard() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [unit, setUnit] = useState<"day" | "month">("day");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    let cancelled = false;

    const fetchTrend = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          store_id: storeId,
          unit,
        });

        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const res = await fetch(
          `${API_BASE}/dashboard/rating-trend?${params.toString()}`,
          { credentials: "include" }
        );

        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        console.error("평점 추이 조회 실패", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrend();
    return () => {
      cancelled = true;
    };
  }, [storeId, from, to, unit]);

  return (
    <Card>
      {/* ================= Header ================= */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-gray-800">
            평점 점수 추이
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            고객 전반 만족도 변화
          </p>
        </div>

        <div className="flex gap-2">
          {(["day", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setUnit(v)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                unit === v
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "day" ? "일별" : "월별"}
            </button>
          ))}
        </div>
      </div>

      {/* ================= Chart ================= */}
      <div className="h-[300px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              {/* Gradient (부드러운 라인 아래 음영) */}
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="date"
                axisLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <YAxis
                domain={[3, 5]}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />

              <Tooltip
                formatter={(v: any) => [`${v}점`, "평균 평점"]}
                labelFormatter={(label, payload: any) =>
                  payload?.[0]?.payload?.highlight
                    ? `${label} (급변 구간)`
                    : label
                }
              />

              {/* Area (화이트 배경 + 은은한 음영) */}
              <Area
                type="monotone"
                dataKey="avg_rating"
                stroke="none"
                fill="url(#scoreGradient)"
              />

              {/* Line + Highlight Dot */}
              <Line
                type="monotone"
                dataKey="avg_rating"
                stroke="#2563eb"
                strokeWidth={3}
                dot={(p: any) => {
                  if (!p.cx || !p.cy) return null;

                  if (p.payload.highlight) {
                    return (
                      <g>
                        {/* glow */}
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r={14}
                          fill="#fee2e2"
                        />
                        {/* core */}
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r={6}
                          fill="#dc2626"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </g>
                    );
                  }

                  return (
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={3}
                      fill="#2563eb"
                    />
                  );
                }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ================= Legend ================= */}
      <div className="flex gap-6 text-sm font-semibold text-gray-500 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600" />
          평균 평점
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          급변 구간
        </div>
      </div>
    </Card>
  );
}