"use client";

import "./dashboard.css";

import { useEffect, useState } from "react";
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
  LabelList,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  Star,
  Tag,
  ListChecks,
  AlertTriangle,
  Loader2,
  Download,
  Sparkles,
} from "lucide-react";

import AppHeader from "@/components/common/AppHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function PrintStyle() {
  return (
    <style jsx global>{`
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
          left: 0;
          top: 0;
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pageEntering, setPageEntering] = useState(true);
  const [data, setData] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setPageEntering(false), 350);
    return () => clearTimeout(id);
  }, []);

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



  if (!data) {
    return (
      <div className="dash-page dash-page--center">
        분석 결과가 없습니다.
      </div>
    );
  }

  const sentimentData = [
    { name: "긍정", value: data.positive, color: "#22c55e" },
    { name: "중립", value: data.neutral, color: "#9ca3af" },
    { name: "부정", value: data.negative, color: "#ef4444" },
  ];

  const pieData = sentimentData.filter((d) => d.value > 0);
  const issueMatrix = data.cx_report.issue_matrix;

  const totalCount = data.positive + data.neutral + data.negative;
  const positiveRatio =
    totalCount > 0 ? Math.round((data.positive / totalCount) * 100) : 0;

  return (
    <main className="dash-page">
      <PrintStyle />
      <AppHeader variant="app" />

      {(pageEntering || loading) && (
        <div className="dash-loading-overlay">
          <Sparkles className="dash-loading-sparkle" />
          <Loader2 className="dash-loading-spinner" />
          <p className="dash-loading-text">
            AI가 고객 경험 데이터를 분석 중입니다…
          </p>
        </div>
      )}

      <section id="print-area" className="dash-report">
        <section className="dash-hero">
          <div>
            <span className="dash-eyebrow">CX INSIGHT REPORT</span>
            <h1 className="dash-title">업로드 데이터 기반 고객 인사이트</h1>
            <p className="dash-subtitle">
              설문 및 리뷰 응답을 종합 분석한 CX 리포트입니다.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="dash-print-btn no-print"
            type="button"
          >
            <Download className="dash-btn-icon" />
            PDF 다운로드
          </button>
        </section>

        <ColorCard color="blue" title="Executive Summary" icon={<Star />}>
          <div className="dash-highlight-box">
            전체 응답 기준 고객 만족도
            <span className="dash-highlight-score"> {data.score}점</span>
          </div>
          <p className="dash-body-text dash-mt-12">{data.summary}</p>
        </ColorCard>

        <ColorCard color="indigo" title="Action Plan" icon={<ListChecks />}>
          <div className="dash-plan-grid">
            {data.cx_report.action_plans.map((p, i) => (
              <div key={i} className="dash-plan-card">
                <span className="dash-step">STEP {i + 1}</span>
                <h4 className="dash-plan-title">{p.title}</h4>
                <p className="dash-plan-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </ColorCard>

        <ColorCard
          color="indigo"
          title="이슈 영향도 매트릭스"
          icon={<AlertTriangle />}
        >
          <p className="dash-body-text dash-mb-16">
            오른쪽 상단일수록 자주 언급되며 만족도에 큰 영향을 미치는 핵심 개선
            이슈입니다.
          </p>

          <div className="dash-chart-box dash-chart-box--tall">
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 20, right: 40, left: 70, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                <ReferenceLine x={50} stroke="#9ca3af" strokeDasharray="4 4" />

                <XAxis
                  type="number"
                  dataKey="frequency"
                  domain={[0, 100]}
                  tickMargin={10}
                  label={{
                    value: "언급 빈도 (Frequency)",
                    position: "insideBottom",
                    offset: -30,
                    style: {
                      fill: "#374151",
                      fontSize: 13,
                      fontWeight: 600,
                    },
                  }}
                />

                <YAxis
                  type="number"
                  dataKey="impact"
                  domain={[-5, 5]}
                  tickMargin={8}
                />

                <text
                  x={30}
                  y={180}
                  transform="rotate(-90, 30, 180)"
                  textAnchor="middle"
                  fill="#374151"
                  fontSize={13}
                  fontWeight={600}
                >
                  만족도 영향도 (Impact)
                </text>

                <ZAxis dataKey="frequency" range={[150, 650]} />

                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const item = payload[0].payload;

                    return (
                      <div className="dash-tooltip">
                        <div className="dash-tooltip-title">{item.label}</div>
                        <div className="dash-tooltip-line">
                          언급 빈도: {item.frequency}
                        </div>
                        <div className="dash-tooltip-line">
                          만족도 영향: {item.impact}
                        </div>
                      </div>
                    );
                  }}
                />

                <Scatter
                  data={issueMatrix.filter((i) => i.type === "negative")}
                  fill="#ef4444"
                >
                  <LabelList dataKey="label" position="top" />
                </Scatter>

                <Scatter
                  data={issueMatrix.filter((i) => i.type === "positive")}
                  fill="#22c55e"
                >
                  <LabelList dataKey="label" position="top" />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-guide-box">
            <h4 className="dash-guide-title">📌 지표 해석 가이드</h4>

            <div className="dash-guide-grid">
              <div className="dash-guide-item">
                <div className="dash-guide-badge dash-guide-badge--blue">F</div>
                <div>
                  <p className="dash-guide-label">언급 빈도 (Frequency)</p>
                  <p className="dash-guide-desc">
                    전체 리뷰 중 해당 이슈가 언급된 비중입니다.
                    <br />
                    값이 클수록 <span className="dash-guide-strong">많은 고객이 공통으로 경험한 문제</span>입니다.
                  </p>
                </div>
              </div>

              <div className="dash-guide-item">
                <div className="dash-guide-badge dash-guide-badge--red">I</div>
                <div>
                  <p className="dash-guide-label">만족도 영향도 (Impact)</p>
                  <p className="dash-guide-desc">
                    해당 이슈가 고객 만족도에 미치는 영향의 강도입니다.
                    <br />
                    <span className="dash-guide-strong">-5에 가까울수록 강한 불만 요인</span>을 의미합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="dash-guide-note">
              👉 <span className="dash-guide-strong">오른쪽 하단 영역</span>에 위치한
              점일수록
              <span className="dash-guide-strong dash-guide-strong--red">
                {" "}
                자주 언급되며 만족도를 크게 떨어뜨리는 최우선 개선 대상
              </span>
              입니다.
            </div>
          </div>
        </ColorCard>

        <div className="dash-chart-grid">
          <ColorCard color="emerald" title="감성 분포" icon={<BarChart3 />}>
            <div className="dash-chart-box">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sentimentData} barCategoryGap={30}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}개`, "리뷰 개수"]}
                  />
                  <Bar dataKey="value" barSize={28}>
                    {sentimentData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="dash-legend">
              {sentimentData.map((s) => (
                <div key={s.name} className="dash-legend-item">
                  <span
                    className="dash-legend-dot"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </ColorCard>

          <ColorCard color="rose" title="감성 비율" icon={<PieIcon />}>
            <div className="dash-donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="dash-donut-center">
                <span className="dash-donut-percent">{positiveRatio}%</span>
                <span className="dash-donut-label">긍정 비율</span>
              </div>
            </div>

            <div className="dash-legend">
              {sentimentData.map((s) => (
                <div key={s.name} className="dash-legend-item">
                  <span
                    className="dash-legend-dot"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </ColorCard>
        </div>

        <ColorCard color="amber" title="강점과 개선 포인트" icon={<AlertTriangle />}>
          <div className="dash-two-col">
            <div>
              <h4 className="dash-section-subtitle dash-section-subtitle--good">
                💪 강점
              </h4>
              <div className="dash-tag-wrap">
                {data.cx_report.strengths.map((s) => (
                  <span key={s} className="dash-tag dash-tag--good">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="dash-section-subtitle dash-section-subtitle--bad">
                ⚠️ 개선 필요
              </h4>
              <div className="dash-tag-wrap">
                {data.cx_report.improvements.map((s) => (
                  <span key={s} className="dash-tag dash-tag--bad">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ColorCard>

        <ColorCard color="blue" title="주요 키워드" icon={<Tag />}>
          <div className="dash-tag-wrap">
            {data.keywords.map((k, i) => (
              <span
                key={`${k}-${i}`}
                className={`dash-tag ${
                  i < 3 ? "dash-tag--primary" : "dash-tag--soft-blue"
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
  return (
    <section className={`dash-card dash-card--${color}`}>
      <h3 className="dash-card-title">
        <span className="dash-card-icon">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}