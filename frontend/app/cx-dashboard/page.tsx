"use client";

/* ✅ prerender / SSG 완전 차단 */
export const dynamic = "force-dynamic";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Sparkles,
  Star,
  Loader2,
  ShieldCheck
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

import AppHeader from "../../components/common/AppHeader";

/* ================= PRINT STYLE ================= */
function PrintStyle() {
  return (
    <style jsx global>{`
      html,
      body {
        background: white !important;
      }

      @media print {
        body * {
          visibility: hidden;
        }

        #print-area,
        #print-area * {
          visibility: visible;
        }

        #print-area {
          position: absolute;
          inset: 0;
          width: 100%;
          background: white;
        }

        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
}

/* ================= API BASE ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= ENTRY ================= */
export default function CxDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <PrintStyle />
      <CxDashboardInner />
    </Suspense>
  );
}

/* ================= PAGE ================= */
function CxDashboardInner() {
  const searchParams = useSearchParams();

  const storeId = searchParams.get("storeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const periodType = searchParams.get("periodType");

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);

  /* ================= 초기 로딩 해제 ================= */
  useEffect(() => {
    setChecking(false);
  }, []);

  /* ================= CX 분석 ================= */
  useEffect(() => {
    if (!storeId) return;

    const controller = new AbortController();
    setLoading(true);
    setErrorMessage(null);

    const id = requestAnimationFrame(() => {
      const fetchAnalysis = async () => {
        try {
          const params = new URLSearchParams({ store_id: storeId });
          if (periodType) params.append("period_type", periodType);
          if (from) params.append("from", from);
          if (to) params.append("to", to);

          const res = await fetch(
            `${API_BASE}/analysis/cx-analysis?${params.toString()}`,
            {
              method: "POST",
              credentials: "include",
              signal: controller.signal,
            }
          );

          const json = await res.json();

          if (!res.ok) {
            setAnalysis(null);
            setErrorMessage(
              json?.detail?.message ||
              json?.detail ||
              "CX 분석 결과를 불러오지 못했습니다."
            );
            return;
          }

          setAnalysis(json);
        } catch (e: any) {
          if (e.name !== "AbortError") {
            console.error(e);
            setAnalysis(null);
            setErrorMessage("CX 분석 요청 중 오류가 발생했습니다.");
          }
        } finally {
          setLoading(false);
        }
      };

      fetchAnalysis();
    });

    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [storeId, from, to, periodType]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  const periodLabel =
    from && to
      ? `${from} ~ ${to}`
      : periodType
        ? periodType
        : "전체 기간";

  const showMainReport = !loading && analysis?.executive_summary;

  return (
    <main className="min-h-screen bg-white">
      <AppHeader variant="app" />

      {downloading && (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            PDF 생성 중…
          </p>
        </div>
      )}

      {loading && !downloading && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-600 mb-3 animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-gray-500 mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            AI가 고객 경험 데이터를 분석 중입니다…
          </p>
        </div>
      )}

      <div className="pt-24 px-6">
        <div
          id="print-area"
          className="max-w-6xl mx-auto bg-white rounded-2xl px-12 py-10 space-y-16"
        >
          <section className="border-b pb-6 flex items-start justify-between gap-6">
            <div>
              <span className="text-xs tracking-widest font-bold text-blue-600">
                CX STRATEGIC REPORT
              </span>
              <h1 className="text-3xl font-extrabold mt-2">
                고객경험(CX) 분석 보고서
              </h1>

              <div className="text-sm font-semibold text-gray-500 mt-3 flex gap-6">
                <span>Store ID: {storeId}</span>
                <span>Analysis Period: {periodLabel}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setDownloading(true);
                setTimeout(() => {
                  window.print();
                  setDownloading(false);
                }, 300);
              }}
              className="no-print flex items-center gap-2 px-5 py-3 rounded-xl
              bg-gradient-to-r from-slate-800 to-slate-900
              text-white text-sm font-semibold shadow-lg
              hover:from-slate-700 hover:to-slate-800"
            >
              <Download className="w-4 h-4" />
              PDF 다운로드
            </button>
          </section>

          {!loading && errorMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && analysis && !analysis.executive_summary && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-5">
              <h2 className="text-lg font-extrabold text-slate-800 mb-2">
                배치 결과 안내
              </h2>
              <p className="text-sm text-slate-600">
                {analysis?.message || "보고서 핵심 요약이 아직 준비되지 않았습니다."}
              </p>
              <div className="mt-4 text-sm text-slate-500 flex flex-wrap gap-6">
                {typeof analysis?.review_count === "number" && (
                  <span>리뷰 수: {analysis.review_count}</span>
                )}
                {typeof analysis?.rating === "number" && (
                  <span>평균 평점: {analysis.rating}</span>
                )}
              </div>
            </section>
          )}

          {showMainReport && (
            <>
              <section className="relative bg-blue-50 rounded-xl px-8 py-6 pl-12">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 rounded-l-xl" />
                <h2 className="text-lg font-extrabold text-blue-700 mb-3">
                  Executive Summary
                </h2>
                <p className="text-sm text-gray-700">
                  “{analysis.executive_summary.summary}”
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <OverallRatingCard rating={analysis.rating} />
                <SentimentCard sentiment={analysis.kpi.sentiment} />
                <NpsCard nps={analysis.kpi.nps} />
              </section>

              <ScoreTrendCard />

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

              <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <InsightsCard insights={analysis.strategic_insights} />
                <RiskCard plan={analysis.risk_and_action_plan} />
              </section>
            </>
          )}

          <footer className="border-t pt-6 text-xs font-semibold text-gray-400 flex justify-between">
            <span>CONFIDENTIAL – FOR INTERNAL USE ONLY</span>
            <span>Generated by CX AI Analyst System © 2026</span>
          </footer>
        </div>
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
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <Card>
      <h3 className="text-lg font-extrabold text-gray-800 mb-4">
        OVERALL RATING
      </h3>

      <div className="flex items-end gap-3 mb-3">
        <div className="text-5xl font-extrabold text-blue-600">
          {rating.toFixed(1)}
        </div>
        <div className="text-lg font-semibold text-gray-400">/ 5.0</div>
      </div>

      <div className="flex items-center gap-1 mb-2">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />;
          }
          if (i === fullStars && hasHalf) {
            return (
              <Star
                key={i}
                className="w-4 h-4 text-yellow-400"
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            );
          }
          return <Star key={i} className="w-4 h-4 text-gray-300" />;
        })}
      </div>

      <p className="text-xs text-gray-500">
        고객 리뷰 기반 종합 만족도 점수
      </p>
    </Card>
  );
}

function SentimentCard({ sentiment }: any) {
  const r = 56;
  const c = 2 * Math.PI * r;

  const pPositive = sentiment.positive / 100;
  const pNeutral = sentiment.neutral / 100;
  const pNegative = sentiment.negative / 100;

  const offsetNegative = c * (1 - pNegative);
  const offsetNeutral = offsetNegative - c * pNeutral;
  const offsetPositive = offsetNeutral - c * pPositive;

  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-4">
        SENTIMENT ANALYSIS
      </h3>

      <svg width="160" height="160" className="mx-auto mb-4">
        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
        />

        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#ef4444"
          strokeWidth="12"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offsetNegative}
          transform="rotate(-90 80 80)"
        />

        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#9ca3af"
          strokeWidth="12"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offsetNeutral}
          transform="rotate(-90 80 80)"
        />

        <circle
          cx="80"
          cy="80"
          r={r}
          stroke="#22c55e"
          strokeWidth="12"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offsetPositive}
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

      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          긍정 {sentiment.positive}%
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          중립 {sentiment.neutral}%
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          부정 {sentiment.negative}%
        </div>
      </div>
    </Card>
  );
}

function NpsCard({ nps }: { nps: number }) {
  const level =
    nps >= 9 ? "Promoters" : nps >= 7 ? "Passives" : "Detractors";

  const color =
    nps >= 9
      ? "text-green-600 bg-green-50"
      : nps >= 7
        ? "text-blue-600 bg-blue-50"
        : "text-red-600 bg-red-50";

  return (
    <Card>
      <h3 className="text-lg font-extrabold mb-4">
        RECOMMENDATION (NPS)
      </h3>

      <div className={`rounded-xl p-4 text-center ${color}`}>
        <div className="text-4xl font-extrabold mb-1">{nps}</div>
        <div className="text-sm font-semibold">{level}</div>
      </div>

      <div className="mt-4 text-xs text-gray-500 leading-relaxed">
        <p>• 9–10: Promoters (추천, 재방문 의사 높음)</p>
        <p>• 7–8: Passives (무난, 보통)</p>
        <p>• 0–6: Detractors (불만, 이탈 위험)</p>
      </div>
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
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${unit === v
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {v === "day" ? "일별" : "월별"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
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

              <Area
                type="monotone"
                dataKey="avg_rating"
                stroke="none"
                fill="url(#scoreGradient)"
              />

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
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r={14}
                          fill="#fee2e2"
                        />
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
