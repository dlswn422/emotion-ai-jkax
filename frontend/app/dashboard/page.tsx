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

  // ✅ 환경변수 기반 API URL (로컬 / 배포 자동 분기)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  /* =========================
     로그인 가드
  ========================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`, {
          credentials: "include",
        });
        const auth = await res.json();

        if (!cancelled && !auth.logged_in) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
        return;
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, API_URL]);

  /* =========================
     분석 결과 로드
  ========================= */
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
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            📊 리뷰 분석 대시보드
          </h1>

          <div className="flex gap-4 text-sm">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
            >
              <Home className="w-4 h-4" />
              메인
            </button>
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              다시 분석
            </button>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-14">
          <KpiCard label="총 리뷰" value={data.total} />
          <KpiCard label="긍정 😊" value={data.positive} />
          <KpiCard label="중립 😐" value={data.neutral} />
          <KpiCard label="부정 😡" value={data.negative} />
        </div>

        {/* 종합 점수 */}
        <Section title="종합 만족도" icon={<Star className="w-5 h-5" />}>
          <div className="flex items-center gap-10">
            <ScoreGauge score={data.score} />
            <p className="text-gray-600">
              AI가 전체 리뷰를 분석하여 <br />
              <b className="text-gray-900">
                {data.score}점 / 10점
              </b>
              으로 평가했습니다.
            </p>
          </div>
        </Section>

        {/* 차트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
          <Section
            title="감성 분포"
            icon={<BarChart3 className="w-5 h-5" />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section
            title="감성 비율"
            icon={<PieIcon className="w-5 h-5" />}
          >
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

        {/* 키워드 */}
        <Section title="주요 키워드" icon={<Tag className="w-5 h-5" />}>
          <div className="flex flex-wrap gap-3">
            {data.keywords.map((k) => (
              <span
                key={k}
                className="px-4 py-2 rounded-full
                           bg-gradient-to-r from-blue-50 to-blue-100
                           text-blue-700 font-semibold text-sm
                           shadow-sm hover:shadow-md transition"
              >
                {k}
              </span>
            ))}
          </div>
        </Section>

        {/* 요약 */}
        <Section title="AI 요약" icon={<FileText className="w-5 h-5" />}>
          <div className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-700 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </Section>
      </div>
    </main>
  );
}

/* =========================
   하위 컴포넌트
========================= */

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
    <div className="bg-white rounded-3xl p-8 shadow-sm mb-14">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const percent = Math.min(score / 10, 1) * 100;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full rotate-[-90deg]">
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="#2563eb"
          strokeWidth="12"
          fill="none"
          strokeDasharray={440}
          strokeDashoffset={
            440 - (440 * percent) / 100
          }
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
        {score}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto animate-pulse space-y-10">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-2xl"
            />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-3xl" />
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