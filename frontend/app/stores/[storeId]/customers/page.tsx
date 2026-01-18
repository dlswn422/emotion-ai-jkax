"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  TrendingDown,
  Smile,
  Meh,
  Frown,
  LogOut,
  Loader2,
  Home,
} from "lucide-react";

/* ================= API ================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OverlayType = "none" | "back" | "logout";

export default function CustomersPage() {
  const { storeId } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [checking, setChecking] = useState(true);
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

  /* ================= 고객 데이터 로드 ================= */
  useEffect(() => {
    if (checking) return;

    const loadCustomers = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/stores/${storeId}/customers`,
          { credentials: "include" }
        );
        const json = await res.json();

        setData({
          summary: {
            total_customers: json.total_customers,
            risky_customers: json.high_risk,
            avg_sentiment_score: json.average_satisfaction,
          },
          customers: json.customers.map((c: any) => ({
            author_name: c.author_name,
            total_reviews: c.review_count,
            avg_rating: c.avg_rating,
            last_review_at: c.last_activity,
            sentiment: c.sentiment,
            churn_probability: c.churn_score / 100,
            risk_level: c.churn_level,
          })),
        });
      } catch (e) {
        console.error(e);
      }
    };

    loadCustomers();
  }, [checking, storeId]);

  /* ================= 로그아웃 ================= */
  const handleLogout = async () => {
    setOverlay("logout");
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

  /* ================= 초기 로딩 ================= */
  if (checking || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  const overlayMessage =
    overlay === "logout" ? "로그아웃 중…" : "";

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* ================= 이동 로딩 오버레이 ================= */}
      {overlay !== "none" && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-semibold text-gray-600">
            {overlayMessage}
          </p>
        </div>
      )}

      {/* ================= 🔧 FIXED HEADER (공통 디자인) ================= */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
          {/* LEFT */}
          <div className="flex items-center">
            <button
              onClick={() => router.push(`/stores/${storeId}`)}
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

        {/* ================= Customers List ================= */}
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
                className="px-10 py-6 grid grid-cols-1 md:grid-cols-7 gap-6 items-center hover:bg-gray-50 transition"
              >
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-900 text-base">
                    {c.author_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    리뷰 {c.total_reviews}회
                  </p>
                </div>

                <InfoBlock label="평점" value={c.avg_rating} />
                <InfoBlock label="최근 활동" value={c.last_review_at} />

                <div>
                  <p className="text-sm text-gray-500 mb-1">감성</p>
                  <Sentiment sentiment={c.sentiment} />
                </div>

                <InfoBlock
                  label="이탈 확률"
                  value={`${(c.churn_probability * 100).toFixed(0)}%`}
                  bold
                />

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
        <p className="text-gray-500 font-semibold">{label}</p>
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
      <p className="text-sm text-gray-500 mb-1">{label}</p>
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
