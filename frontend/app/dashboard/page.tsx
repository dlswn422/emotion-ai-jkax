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
  LogOut,
  Loader2,
} from "lucide-react";

/* ✅ API BASE */
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

type OverlayType = "none" | "home" | "upload" | "logout";

export default function DashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [overlay, setOverlay] = useState<OverlayType>("none");

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
          return;
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

  /* ================= 로그아웃 ================= */
  const handleLogout = async () => {
    setOverlay("logout");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setTimeout(() => router.replace("/login"), 600);
    }
  };

  /* ================= 네비게이션 ================= */
  const goHome = () => {
    setOverlay("home");
    setTimeout(() => router.push("/"), 600);
  };

  const goUpload = () => {
    setOverlay("upload");
    setTimeout(() => router.push("/upload"), 600);
  };

  /* ================= 초기 로딩 (F5 포함) ================= */
  if (checking || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100
                       flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-600">
            대시보드 불러오는 중…
          </p>
        </div>
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

  const overlayMessage =
    overlay === "none"
      ? ""
      : {
          home: "메인 화면으로 이동 중…",
          upload: "다시 분석 화면으로 이동 중…",
          logout: "로그아웃 중…",
        }[overlay];

  const chartData = [
    { name: "긍정", value: data.positive, color: "#22c55e" },
    { name: "중립", value: data.neutral, color: "#facc15" },
    { name: "부정", value: data.negative, color: "#ef4444" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      {/* 공통 이동 로딩 오버레이 */}
      {overlay !== "none" && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur
                        flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">
            {overlayMessage}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            <Home className="w-4 h-4" />
            메인으로
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={goUpload}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              다시 분석
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-14">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            📊 리뷰 분석 대시보드
          </h1>
          <p className="text-gray-600">
            업로드한 리뷰 데이터를 기반으로 AI가 도출한 고객 인사이트입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <KpiCard label="총 리뷰" value={data.total} />
          <KpiCard label="긍정 😊" value={data.positive} />
          <KpiCard label="중립 😐" value={data.neutral} />
          <KpiCard label="부정 😡" value={data.negative} />
        </div>

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

        <Section title="주요 키워드" icon={<Tag className="w-5 h-5" />}>
          <div className="flex flex-wrap gap-3">
            {data.keywords.map((k) => (
              <span
                key={k}
                className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-100"
              >
                {k}
              </span>
            ))}
          </div>
        </Section>

        <Section title="AI 요약" icon={<FileText className="w-5 h-5" />}>
          <div className="bg-slate-50 rounded-2xl p-8 border-l-4 border-blue-600">
            <p className="text-gray-700 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </Section>
      </section>
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
    <div className="bg-white rounded-2xl p-6 shadow-sm">
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
        <circle cx="88" cy="88" r="76" stroke="#e5e7eb" strokeWidth="12" fill="none" />
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