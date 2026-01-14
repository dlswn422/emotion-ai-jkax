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
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Home,
  BarChart3,
  PieChart as PieIcon,
  Star,
  Tag,
  FileText,
} from "lucide-react";

/* ✅ 컴포넌트 밖에서 API BASE 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AnalysisResult = {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  score: number;
  keywords: string[];
  summary: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

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

  /* ================= 분석 결과 로드 ================= */
  useEffect(() => {
    const saved = sessionStorage.getItem("analysisResult");
    if (saved) {
      setData(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  if (checking || loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        분석 결과가 없습니다.
      </div>
    );
  }

  const chartData = [
    { name: "긍정", value: data.positive, color: "#22c55e" },
    { name: "중립", value: data.neutral, color: "#facc15" },
    { name: "부정", value: data.negative, color: "#ef4444" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            📊 리뷰 분석 대시보드
          </h1>

          <div className="flex gap-4 text-sm">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600 font-semibold transition"
            >
              <Home className="w-4 h-4" />
              메인
            </button>
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600 font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              다시 분석
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <KpiCard label="총 리뷰" value={data.total} />
          <KpiCard label="긍정 😊" value={data.positive} />
          <KpiCard label="중립 😐" value={data.neutral} />
          <KpiCard label="부정 😡" value={data.negative} />
        </div>

        {/* Score */}
        <Section title="종합 만족도" icon={<Star className="w-5 h-5" />}>
          <div className="flex items-center gap-12">
            <ScoreGauge score={data.score} />
            <p className="text-gray-600 leading-relaxed">
              AI가 전체 리뷰를 종합 분석한 결과<br />
              <span className="text-gray-900 font-extrabold text-lg">
                {data.score}점 / 10점
              </span>
              으로 평가되었습니다.
            </p>
          </div>
        </Section>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <Section title="감성 분포" icon={<BarChart3 className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="감성 비율" icon={<PieIcon className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Keywords */}
        <Section title="주요 키워드" icon={<Tag className="w-5 h-5" />}>
          <div className="flex flex-wrap gap-3">
            {data.keywords.map((k) => (
              <span
                key={k}
                className="
                  px-4 py-2 rounded-full
                  bg-blue-50 text-blue-700
                  font-semibold text-sm
                  border border-blue-100
                  hover:bg-blue-100
                  transition
                "
              >
                {k}
              </span>
            ))}
          </div>
        </Section>

        {/* Summary */}
        <Section title="AI 요약" icon={<FileText className="w-5 h-5" />}>
          <div className="bg-slate-50 rounded-2xl p-8 border-l-4 border-blue-600">
            <p className="text-gray-700 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </Section>
      </div>
    </main>
  );
}

/* ================= Components ================= */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl p-8 shadow-sm mb-14">
      <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2 text-gray-800">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-extrabold text-gray-900">
        {value}
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const percent = Math.min(score / 10, 1) * 100;

  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full rotate-[-90deg]">
        <circle
          cx="88"
          cy="88"
          r="76"
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="88"
          cy="88"
          r="76"
          stroke="#2563eb"
          strokeWidth="12"
          fill="none"
          strokeDasharray={478}
          strokeDashoffset={478 - (478 * percent) / 100}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-gray-900">
        {score}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-7xl mx-auto animate-pulse space-y-12">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-2xl"
            />
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-3xl" />
        <div className="grid grid-cols-2 gap-10">
          <div className="h-64 bg-gray-200 rounded-3xl" />
          <div className="h-64 bg-gray-200 rounded-3xl" />
        </div>
        <div className="h-32 bg-gray-200 rounded-3xl" />
        <div className="h-32 bg-gray-200 rounded-3xl" />
      </div>
    </div>
  );
}