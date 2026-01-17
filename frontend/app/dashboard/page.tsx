"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  Home,
  BarChart3,
  PieChart as PieIcon,
  Star,
  Tag,
  ListChecks,
  AlertTriangle,
  LogOut,
  Loader2,
} from "lucide-react";

/* ================= API BASE ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================= TYPES ================= */
type ActionPlan = {
  title: string;
  desc: string;
};

type IssueMatrixItem = {
  label: string;
  frequency: number;
  impact: number;
  type: "positive" | "negative";
};

type CXReport = {
  action_plans: ActionPlan[];
  strengths: string[];
  improvements: string[];
  issue_matrix: IssueMatrixItem[];
};

type AnalysisResult = {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  score: number;
  keywords: string[];
  summary: string;
  cx_report: CXReport;
};

/* ================= PAGE ================= */
export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalysisResult | null>(null);

  /* ---------- 로그인 체크 ---------- */
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const auth = await res.json();
        if (!auth.logged_in) router.replace("/login");
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };
    checkLogin();
  }, [router]);

  /* ---------- 분석 결과 로딩 (🔥 핵심) ---------- */
  useEffect(() => {
    const saved = sessionStorage.getItem("analysisResult");
    if (saved) {
      const parsed = JSON.parse(saved);

      const normalizedIssueMatrix: IssueMatrixItem[] =
        (parsed.cx_report?.issue_matrix ?? []).map((i: any) => ({
          label: i.label,
          frequency: Number(i.frequency) || 0,
          impact: Number(i.impact) || 0,
          type: Number(i.impact) >= 0 ? "positive" : "negative",
        }));

      setData({
        total: parsed.total ?? 0,
        positive: parsed.positive ?? 0,
        neutral: parsed.neutral ?? 0,
        negative: parsed.negative ?? 0,
        score: parsed.score ?? 0,
        keywords: parsed.keywords ?? [],
        summary: parsed.summary ?? "",
        cx_report: {
          action_plans: parsed.cx_report?.action_plans ?? [],
          strengths: parsed.cx_report?.strengths ?? [],
          improvements: parsed.cx_report?.improvements ?? [],
          issue_matrix: normalizedIssueMatrix,
        },
      });
    }
    setLoading(false);
  }, []);

  /* ---------- 로딩 ---------- */
  if (checking || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        분석 결과가 없습니다.
      </div>
    );
  }

  /* ================= 파생 데이터 ================= */
  const sentimentData = [
    { name: "긍정", value: data.positive, color: "#22c55e" },
    { name: "중립", value: data.neutral, color: "#9ca3af" },
    { name: "부정", value: data.negative, color: "#ef4444" },
  ];

  const pieData = sentimentData.filter((d) => d.value > 0);
  const issueMatrix = data.cx_report.issue_matrix;

  /* ================= RENDER ================= */
  return (
    <main className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="nav-btn">
            <Home className="w-4 h-4" /> 메인으로
          </button>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/upload")} className="nav-btn">
              <ArrowLeft className="w-4 h-4" /> 다시 분석
            </button>
            <button
              onClick={() => router.push("/login")}
              className="nav-btn hover:text-red-500"
            >
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 space-y-14">
        {/* Title */}
        <section>
          <span className="text-xs tracking-widest font-bold text-blue-600">
            CX INSIGHT REPORT
          </span>
          <h1 className="text-3xl font-extrabold mt-2">
            업로드 데이터 기반 고객 인사이트
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-3">
            설문 및 리뷰 응답을 종합 분석한 CX 리포트입니다.
          </p>
        </section>

        {/* Executive */}
        <ColorCard color="blue" title="Executive Summary" icon={<Star />}>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-800">
              전체 응답 기준 고객 만족도
              <span className="text-blue-700 font-extrabold">
                {" "}
                {data.score}점
              </span>
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-3">{data.summary}</p>
        </ColorCard>

        {/* Action Plan */}
        <ColorCard color="indigo" title="Action Plan" icon={<ListChecks />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.cx_report.action_plans.map((p, i) => (
              <div key={i} className="bg-indigo-50 rounded-xl p-4">
                <span className="text-xs font-bold text-indigo-600">
                  STEP {i + 1}
                </span>
                <h4 className="font-bold mt-1">{p.title}</h4>
                <p className="text-sm mt-2 text-gray-700">{p.desc}</p>
              </div>
            ))}
          </div>
        </ColorCard>

        {/* Issue Impact Matrix */}
        <ColorCard
          color="indigo"
          title="이슈 영향도 매트릭스"
          icon={<AlertTriangle />}
        >
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <ReferenceLine x={50} stroke="#9ca3af" />
              <XAxis type="number" dataKey="frequency" domain={[0, 100]} />
              <YAxis type="number" dataKey="impact" domain={[-5, 5]} />
              <ZAxis range={[200, 700]} />
              <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.label} />
              <Scatter
                data={issueMatrix.filter((i) => i.type === "negative")}
                fill="#ef4444"
              />
              <Scatter
                data={issueMatrix.filter((i) => i.type === "positive")}
                fill="#22c55e"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ColorCard>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ColorCard color="emerald" title="감성 분포" icon={<BarChart3 />}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sentimentData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value">
                  {sentimentData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ColorCard>

          <ColorCard color="rose" title="감성 비율" icon={<PieIcon />}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={100}
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ColorCard>
        </div>

        {/* Strength vs Improvement */}
        <ColorCard color="amber" title="강점과 개선 포인트" icon={<AlertTriangle />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-emerald-600 font-bold mb-3">💪 강점</h4>
              <div className="flex flex-wrap gap-3">
                {data.cx_report.strengths.map((s) => (
                  <span key={s} className="px-4 py-2 rounded-full bg-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-rose-600 font-bold mb-3">⚠️ 개선 필요</h4>
              <div className="flex flex-wrap gap-3">
                {data.cx_report.improvements.map((s) => (
                  <span key={s} className="px-4 py-2 rounded-full bg-rose-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ColorCard>

        {/* Keywords */}
        <ColorCard color="blue" title="주요 키워드" icon={<Tag />}>
          <div className="flex flex-wrap gap-3">
            {data.keywords.map((k, i) => (
              <span
                key={`${k}-${i}`}
                className={`px-5 py-2 rounded-full font-semibold ${
                  i < 3
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {i < 3 ? "⭐ " : ""}
                {k}
              </span>
            ))}
          </div>
        </ColorCard>
      </section>
    </main>
  );
}

/* ================= SHARED ================= */
function ColorCard({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: "blue" | "indigo" | "emerald" | "rose" | "amber";
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-300",
    indigo: "border-indigo-300",
    emerald: "border-emerald-300",
    rose: "border-rose-300",
    amber: "border-amber-300",
  };

  return (
    <section
      className={`bg-white rounded-2xl p-7 shadow-md border-l-4 ${colorMap[color]}`}
    >
      <h3 className="text-lg font-extrabold mb-4 flex items-center gap-3">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}