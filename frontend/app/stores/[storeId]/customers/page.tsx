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

/* ✅ 컴포넌트 밖에서 API BASE 고정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CustomersPage() {
  const { storeId } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  /* ================= 로그인 가드 (쿠키 기반) ================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include", // ⭐⭐⭐ 핵심
        });
        const auth = await res.json();

        if (!cancelled && !auth.logged_in) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
          return;
        }
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
  }, [router]); // ✅ API_BASE 제거 (중요)

  /* ================= MOCK 데이터 로드 ================= */
  useEffect(() => {
    if (!checking) {
      setData(MOCK);
    }
  }, [checking]);

  if (checking || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        로딩 중...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">👥 고객 분석</h1>
            <p className="text-gray-500 mt-1">
              리뷰 작성 고객의 성향과 이탈 위험을 분석합니다
            </p>
          </div>

          <button
            onClick={() => router.push(`/stores/${storeId}`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            매장 상세로
          </button>
        </header>

        {/* KPI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Kpi
            icon={<Users className="text-blue-600" />}
            label="전체 고객"
            value={`${data.summary.total_customers}명`}
          />
          <Kpi
            icon={<AlertTriangle className="text-red-500" />}
            label="이탈 위험 고객"
            value={`${data.summary.risky_customers}명`}
          />
          <Kpi
            icon={<TrendingDown className="text-purple-500" />}
            label="평균 만족도"
            value={data.summary.avg_sentiment_score}
          />
        </section>

        {/* Table */}
        <section className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 border-b">
            <h2 className="text-xl font-extrabold">고객 목록</h2>
            <p className="text-sm text-gray-500 mt-1">
              고객별 리뷰 행동 및 이탈 위험도
            </p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>고객</Th>
                  <Th>리뷰</Th>
                  <Th>평점</Th>
                  <Th>최근 활동</Th>
                  <Th>감성</Th>
                  <Th>이탈 확률</Th>
                  <Th>위험</Th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <Td className="font-semibold">{c.author_name}</Td>
                    <Td>{c.total_reviews}</Td>
                    <Td>{c.avg_rating}</Td>
                    <Td>{c.last_review_at}</Td>
                    <Td>
                      <Sentiment sentiment={c.sentiment} />
                    </Td>
                    <Td className="font-semibold">
                      {(c.churn_probability * 100).toFixed(0)}%
                    </Td>
                    <Td>
                      <Risk level={c.risk_level} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================= Components ================= */

function Kpi({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-md">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Th({ children }: any) {
  return (
    <th className="px-6 py-4 text-left text-gray-600 font-semibold">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: any) {
  return (
    <td className={`px-6 py-4 text-gray-700 ${className}`}>
      {children}
    </td>
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
      className={`px-3 py-1 rounded-full text-xs font-bold ${map[level]}`}
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
      className={`flex items-center gap-1 font-semibold ${map[sentiment].color}`}
    >
      {map[sentiment].icon}
      {sentiment}
    </div>
  );
}