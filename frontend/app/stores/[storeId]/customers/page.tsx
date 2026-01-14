"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  TrendingDown,
  ArrowLeft,
  Smile,
  Meh,
  Frown,
  LogOut,
} from "lucide-react";

/* ================= MOCK ================= */
const MOCK = {
  summary: {
    total_customers: 42,
    risky_customers: 8,
    avg_sentiment_score: 7.6,
  },
  customers: [
    {
      author_name: "홍길동",
      total_reviews: 5,
      avg_rating: 3.4,
      last_review_at: "2026-01-05",
      sentiment: "negative",
      churn_probability: 0.78,
      risk_level: "HIGH",
    },
    {
      author_name: "김인주",
      total_reviews: 3,
      avg_rating: 4.7,
      last_review_at: "2026-01-09",
      sentiment: "positive",
      churn_probability: 0.12,
      risk_level: "LOW",
    },
    {
      author_name: "이서연",
      total_reviews: 2,
      avg_rating: 3.9,
      last_review_at: "2026-01-02",
      sentiment: "neutral",
      churn_probability: 0.45,
      risk_level: "MEDIUM",
    },
  ],
};

/* ================= API ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CustomersPage() {
  const { storeId } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
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

  useEffect(() => {
    if (!checking) setData(MOCK);
  }, [checking]);

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
  };

  if (checking || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        로딩 중...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ================= Header ================= */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/stores/${storeId}`)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            매장 상세
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      {/* ================= Content ================= */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            고객 분석
          </h1>
          <p className="text-gray-500 mt-3 text-base">
            리뷰 작성 고객의 성향과 이탈 위험도를 종합 분석합니다
          </p>
        </div>

        {/* KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Kpi
            icon={<Users className="w-6 h-6 text-blue-600" />}
            label="전체 고객"
            value={`${data.summary.total_customers}명`}
          />
          <Kpi
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
            label="이탈 위험 고객"
            value={`${data.summary.risky_customers}명`}
          />
          <Kpi
            icon={<TrendingDown className="w-6 h-6 text-purple-500" />}
            label="평균 만족도"
            value={data.summary.avg_sentiment_score}
          />
        </section>

        {/* ================= Customers List (개선된 부분) ================= */}
        <section className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-10 py-8 border-b">
            <h2 className="text-2xl font-extrabold">
              고객 목록
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              고객별 리뷰 활동 및 이탈 위험 지표
            </p>
          </div>

          <div className="divide-y">
            {data.customers.map((c: any, idx: number) => (
              <div
                key={idx}
                className="
                  px-10 py-6
                  grid grid-cols-1 md:grid-cols-7 gap-6
                  items-center
                  hover:bg-gray-50 transition
                "
              >
                {/* 고객 */}
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-900 text-base">
                    {c.author_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    리뷰 {c.total_reviews}회
                  </p>
                </div>

                {/* 평점 */}
                <InfoBlock label="평점" value={c.avg_rating} />

                {/* 최근 활동 */}
                <InfoBlock
                  label="최근 활동"
                  value={c.last_review_at}
                />

                {/* 감성 */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    감성
                  </p>
                  <Sentiment sentiment={c.sentiment} />
                </div>

                {/* 이탈 확률 */}
                <InfoBlock
                  label="이탈 확률"
                  value={`${(c.churn_probability * 100).toFixed(0)}%`}
                  bold
                />

                {/* 위험도 */}
                <div className="flex justify-start md:justify-end">
                  <Risk level={c.risk_level} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

/* ================= Components ================= */

function Kpi({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-3xl p-10 shadow-md hover:shadow-xl transition">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-gray-500 font-semibold">
          {label}
        </p>
      </div>
      <p className="text-4xl font-extrabold tracking-tight text-gray-900">
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">
        {label}
      </p>
      <p
        className={`${
          bold ? "font-extrabold" : "font-semibold"
        } text-gray-900`}
      >
        {value}
      </p>
    </div>
  );
}

function Risk({ level }: any) {
  const map: any = {
    HIGH: "bg-red-100 text-red-600",
    MEDIUM: "bg-orange-100 text-orange-600",
    LOW: "bg-green-100 text-green-600",
  };

  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-bold ${map[level]}`}
    >
      {level}
    </span>
  );
}

function Sentiment({ sentiment }: any) {
  const map: any = {
    positive: {
      icon: <Smile className="w-4 h-4" />,
      color: "text-blue-600",
    },
    neutral: {
      icon: <Meh className="w-4 h-4" />,
      color: "text-gray-600",
    },
    negative: {
      icon: <Frown className="w-4 h-4" />,
      color: "text-red-600",
    },
  };

  return (
    <div
      className={`flex items-center gap-1.5 font-semibold ${map[sentiment].color}`}
    >
      {map[sentiment].icon}
      {sentiment}
    </div>
  );
}