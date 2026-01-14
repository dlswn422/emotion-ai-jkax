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
} from "lucide-react";

/* ✅ 컴포넌트 밖에서 API BASE 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= MOCK ================= */
const MOCK = {
  client: "예원식당 (YEWON Restaurant)",
  source: "Google Reviews",

  summary:
    "전반적인 고객 만족도가 평균 4.92점(5점 만점)으로 최상위 수준을 유지하고 있습니다. 특히 음식 품질과 직원의 서비스 응대가 핵심 강점으로 식별되었으며, 이탈 위험도가 낮아 안정적인 성장세가 기대됩니다.",

  rating: 4.92,
  nps: 9.54,

  sentiment: {
    positive: 92.3,
    neutral: 5.4,
    negative: 2.3,
  },

  keywords: ["친절한 서비스", "음식 맛", "가성비", "재방문 의사"],

  drivers: [
    { label: "음식 퀄리티 (Taste & Quality)", value: 53.8 },
    { label: "직원 응대 (Service)", value: 23.1 },
    { label: "기타 (Others)", value: 23.1 },
  ],

  improvements: [
    { label: "메뉴 설명 부족 (Menu Guide)", value: 46.2 },
    { label: "기타 (Others)", value: 30.8 },
    { label: "가격/가성비 (Value)", value: 15.4 },
    { label: "고기 품질 일관성 (Consistency)", value: 15.4 },
  ],

  insights: [
    {
      title: "우수한 고객 만족도 유지",
      desc: "평균 4.92점으로 업계 상위 1% 수준의 만족도를 유지하고 있습니다.",
    },
    {
      title: "강력한 구전 마케팅 잠재력",
      desc: "NPS 9.54점으로 재방문 및 추천 가능성이 매우 높습니다.",
    },
    {
      title: "서비스 접점(MOT) 개선 필요",
      desc: "메뉴 설명 부족은 객단가 상승 기회 손실로 이어질 수 있습니다.",
    },
  ],

  actionPlan: [
    { area: "경험 강화", action: "메뉴 설명 및 추천 멘트 강화" },
    { area: "메뉴 개선", action: "시그니처 메뉴 시각적 강조" },
    { area: "프로모션", action: "재방문 고객 혜택 지속 운영" },
    { area: "품질 관리", action: "고기 품질 일일 점검 체계 강화" },
  ],
};

/* ================= ENTRY ================= */
export default function CxDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-400 text-sm">대시보드 로딩 중...</p>
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

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-sm">
          로그인 상태 확인 중...
        </p>
      </main>
    );
  }

  const periodLabel =
    from && to ? `${from} ~ ${to}` : "전체 기간";

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      {/* Actions */}
      <div className="max-w-6xl mx-auto flex justify-between mb-8 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <button
          onClick={() => window.print()}
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
        {/* Header */}
        <section className="border-b pb-6">
          <span className="text-xs tracking-widest font-bold text-blue-600">
            CX STRATEGIC REPORT
          </span>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
            고객경험(CX) 분석 보고서
          </h1>

          <div className="text-sm font-semibold text-gray-500 mt-3 flex justify-between">
            <span>Client: {MOCK.client}</span>
            <span>Analysis Period: {periodLabel}</span>
          </div>

          <div className="text-sm font-semibold text-gray-500 mt-1 text-right">
            Source: {MOCK.source}
            {storeId && ` · Store ID: ${storeId}`}
          </div>
        </section>

        {/* Executive Summary */}
        <section className="relative bg-blue-50 rounded-xl px-8 py-6 pl-12">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 rounded-l-xl" />
          <h2 className="text-lg font-extrabold text-blue-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Executive Summary
          </h2>
          <p className="text-sm leading-relaxed font-medium text-gray-700">
            “{MOCK.summary}”
          </p>
        </section>

        {/* KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <OverallRatingCard />
          <SentimentCard />
          <NpsCard />
        </section>

        {/* Drivers / Improvements */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ProgressBlock
            title="🔥 Key Drivers of Satisfaction"
            items={MOCK.drivers}
            color="blue"
          />
          <ProgressBlock
            title="🛠 Areas for Improvement"
            items={MOCK.improvements}
            color="gray"
          />
        </section>

        {/* Insights / Risk */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <InsightsCard />
          <RiskCard />
        </section>

        <footer className="border-t pt-6 text-xs font-semibold text-gray-400 flex justify-between">
          <span>CONFIDENTIAL – FOR INTERNAL USE ONLY</span>
          <span>Generated by CX AI Analyst System © 2026</span>
        </footer>
      </div>
    </main>
  );
}

/* ================= Shared Components ================= */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-gray-200 p-6 shadow-sm bg-white h-full">
      <div className="absolute left-0 top-0 h-full w-1 bg-gray-100 rounded-l-xl" />
      <div className="pl-2">{children}</div>
    </div>
  );
}

/* ================= KPI Cards ================= */

function OverallRatingCard() {
  return (
    <Card>
      <h3 className="text-lg font-extrabold text-gray-800 mb-4">
        OVERALL RATING
      </h3>

      <div className="flex items-end gap-3">
        <div className="text-5xl font-extrabold text-blue-600 tracking-tight">
          {MOCK.rating}
        </div>
        <div className="text-lg font-semibold text-gray-400">/ 5.0</div>
      </div>

      <div className="flex gap-1 mt-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-400" />
        ))}
      </div>

      <p className="mt-2 text-sm font-medium text-gray-600">
        고객 전반 만족도 지표
      </p>
    </Card>
  );
}

/* ================= Sentiment + Legend ================= */

function SentimentCard() {
  const r = 56;
  const c = 2 * Math.PI * r;
  const p = MOCK.sentiment.positive / 100;

  return (
    <Card>
      <h3 className="text-lg font-extrabold text-gray-800 mb-4">
        SENTIMENT ANALYSIS
      </h3>

      <div className="flex flex-col items-center gap-4 drop-shadow-sm">
        <svg width="160" height="160">
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
            {MOCK.sentiment.positive}%
          </text>
        </svg>

        {/* Legend */}
        <div className="flex gap-4 text-sm font-semibold text-gray-600">
          <LegendItem color="bg-green-500" label="긍정" />
          <LegendItem color="bg-yellow-400" label="중립" />
          <LegendItem color="bg-red-500" label="부정" />
        </div>
      </div>
    </Card>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

/* ================= Other Cards ================= */

function NpsCard() {
  const r = 56;
  const c = 2 * Math.PI * r;
  const p = MOCK.nps / 10;

  return (
    <Card>
      <h3 className="text-lg font-extrabold text-gray-800 mb-4">
        RECOMMENDATION (NPS)
      </h3>

      <div className="flex flex-col items-center gap-5 drop-shadow-sm">
        <svg width="160" height="160">
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
            {MOCK.nps}
          </text>
        </svg>
      </div>
    </Card>
  );
}

function ProgressBlock({ title, items, color }: any) {
  const bar =
    color === "blue" ? "bg-blue-600" : "bg-gray-500";

  return (
    <Card>
      <div className="pb-3 mb-5 border-b">
        <h3 className="text-lg font-extrabold text-gray-800">
          {title}
        </h3>
      </div>

      <div className="space-y-6">
        {items.map((i: any) => (
          <div key={i.label}>
            <div className="flex justify-between text-sm font-medium mb-1">
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
      </div>
    </Card>
  );
}

function InsightsCard() {
  return (
    <Card>
      <div className="pb-3 mb-5 border-b">
        <h3 className="text-lg font-extrabold text-blue-600 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Strategic Insights
        </h3>
      </div>

      <div className="space-y-6">
        {MOCK.insights.map((i, idx) => (
          <div key={i.title} className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">
              {idx + 1}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{i.title}</p>
              <p className="text-sm font-medium text-gray-600 mt-1 leading-relaxed">
                {i.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RiskCard() {
  return (
    <Card>
      <div className="pb-3 mb-5 border-b">
        <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          Risk Management & Action Plan
        </h3>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {MOCK.actionPlan.map((a) => (
            <tr key={a.area} className="border-t">
              <td className="py-3 font-semibold text-gray-800 w-1/3">
                {a.area}
              </td>
              <td className="py-3 font-medium text-gray-600">
                {a.action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}