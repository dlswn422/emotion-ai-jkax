const {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
} = Vue;

const { useRouter, useRoute } = VueRouter;

import { STORES } from "../data/storesMock.js";
import { fmtDate, starsStr } from "../utils/helpers.js";
import { destroyChart } from "../utils/charts.js";
import { NavBar } from "../components/NavBar.js";
import { analyzeCx } from "../api/reports.js";
import { getCustomers } from "../api/customers.js";
import { CustomerPage } from "./StoreCustomerAnalysisPage.js";

export const StoreReportPage = defineComponent({
  name: "StoreReportPage",
  components: { NavBar, CustomerPage },

  setup() {
    const route = useRoute();
    const router = useRouter();

    // 키워드 워드클라우드 탭 상태
    const keywordTab = ref("all");

    // 현재 보고서 대상 매장
    const storeId = route.params.id;
    const store = STORES.find((s) => s.id === storeId) || STORES[0];

    // 로딩 / 에러 / 활성 탭 / 차트 모드 상태
    const loading = ref(true);
    const error = ref("");
    const reportStatus = ref("IDLE");
    const reportStatusMessage = ref("");
    const activeTab = ref("summary");
    const chartMode = ref("daily");

    // 모바일 392px 이하에서만 상위 탭을 스택 모드로 전환
    const viewportWidth = ref(window.innerWidth);
    const isMobileStackMode = computed(() => viewportWidth.value <= 600);

    // 로딩 테마
    const LOADING_THEME = {
      tone: "external",
      kicker: "AI REVIEW ANALYSIS",
      title: "보고서 생성 중",
      desc: "AI가 리뷰 데이터를 분석하고 있습니다.",
    };

    function handleResize() {
      viewportWidth.value = window.innerWidth;
    }

    function isVisible(tabId) {
      return isMobileStackMode.value || activeTab.value === tabId;
    }

    // 보고서 / 고객 분석 데이터 상태
    const report = ref(null);
    const customers = ref({
      summary: {
        totalCustomers: { current: 0, previous: 0, delta_pct: 0 },
        atRiskCustomers: { current: 0, previous: 0, delta_pct: 0 },
        avgSatisfaction: { current: 0, previous: 0, delta_pct: 0 },
        repeatVisitRate: { current: 0, previous: 0, delta_pct: 0 },
      },
      riskDistribution: {},
      visitFrequencyDistribution: {},
      segments: {},
      cohort: { rows: [], summary_text: "" },
      list: [],
    });

    // 차트 인스턴스 참조
    let lineChart = null;
    let summaryLineChart = null;
    let donutChart = null;

    // 좌측 사이드바 메뉴
    const NAV_ITEMS = [
      {
        id: "summary",
        label: "Executive Summary",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        id: "rating",
        label: "Overall Rating",
        icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
      },
      {
        id: "segment",
        label: "Segment Analysis",
        hidden: true,
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      },
      {
        id: "keyword",
        label: "키워드 워드클라우드",
        icon: "M7 18a4.6 4.6 0 01.88-9.117A5.5 5.5 0 0118.5 10a3.5 3.5 0 010 7H7z",
      },
      {
        id: "nps",
        label: "NPS Score",
        icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      },
      {
        id: "trend",
        label: "평점 추이",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
      {
        id: "drivers",
        label: "Key Drivers",
        icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
      },
      {
        id: "improve",
        label: "Improvements",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      },
      {
        id: "insights",
        label: "AI Insights",
        icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      },
      {
        id: "action",
        label: "Action Plan",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
      {
        id: "customers",
        label: "고객 분석",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
        divider: true,
      },
    ];

    function normalizeSentiment(sentiment = {}) {
      return {
        positive: Number(sentiment.positive ?? sentiment.positive_pct ?? 0),
        neutral: Number(sentiment.neutral ?? sentiment.neutral_pct ?? 0),
        negative: Number(sentiment.negative ?? sentiment.negative_pct ?? 0),
      };
    }

    function buildRatingDist(overallRating = 0, reviewCount = 0) {
      const safeCount = Number(reviewCount || 0);

      if (!safeCount) {
        return [
          { stars: 5, count: 0 },
          { stars: 4, count: 0 },
          { stars: 3, count: 0 },
          { stars: 2, count: 0 },
          { stars: 1, count: 0 },
        ];
      }

      const avg = Number(overallRating || 0);
      const five = Math.round(
        safeCount * (avg >= 4.5 ? 0.62 : avg >= 4.0 ? 0.5 : 0.35),
      );
      const four = Math.round(safeCount * 0.23);
      const three = Math.round(safeCount * 0.09);
      const two = Math.round(safeCount * 0.04);
      const one = Math.max(0, safeCount - five - four - three - two);

      return [
        { stars: 5, count: five },
        { stars: 4, count: four },
        { stars: 3, count: three },
        { stars: 2, count: two },
        { stars: 1, count: one },
      ];
    }

    function normalizeKeywords(json = {}) {
      const pos = json.positive_keywords || json.positive || [];
      const neg = json.negative_keywords || json.negative || [];
      const all = json.all_keywords || json.all || [];

      function toWordItems(list = [], type = "all") {
        return list
          .map((item) => {
            const text = typeof item === "string" ? item : item.text || "";
            const rawSize =
              typeof item === "object" ? Number(item.size || 0) : 0;

            let size = 18;
            if (rawSize >= 34) size = 28;
            else if (rawSize >= 28) size = 24;
            else if (rawSize >= 22) size = 20;
            else size = 18;

            return {
              text,
              size,
              tone:
                type === "positive"
                  ? "pos"
                  : type === "negative"
                    ? "neg"
                    : "all",
            };
          })
          .filter((v) => v.text);
      }

      const positiveItems = toWordItems(pos, "positive");
      const negativeItems = toWordItems(neg, "negative");

      const positiveMap = new Map(
        positiveItems.map((item) => [item.text, item]),
      );
      const negativeMap = new Map(
        negativeItems.map((item) => [item.text, item]),
      );

      const mergedAll = [];

      all.forEach((item) => {
        const text = typeof item === "string" ? item : item.text || "";
        if (!text) return;

        if (positiveMap.has(text)) {
          mergedAll.push(positiveMap.get(text));
          return;
        }

        if (negativeMap.has(text)) {
          mergedAll.push(negativeMap.get(text));
          return;
        }
      });

      positiveItems.forEach((item) => {
        if (!mergedAll.some((v) => v.text === item.text)) {
          mergedAll.push(item);
        }
      });

      negativeItems.forEach((item) => {
        if (!mergedAll.some((v) => v.text === item.text)) {
          mergedAll.push(item);
        }
      });

      return {
        positive: positiveItems,
        negative: negativeItems,
        all: mergedAll,
      };
    }

    function normalizeDrivers(list = []) {
      return (list || []).slice(0, 5).map((item, idx) => ({
        name: item.name || item.label || `강점 ${idx + 1}`,
        pct: Number(item.pct ?? item.value ?? item.score ?? item.ratio ?? 0),
        emoji: item.emoji || "✨",
      }));
    }

    function normalizeImprovements(list = []) {
      return (list || []).slice(0, 5).map((item, idx) => ({
        name: item.name || item.label || `개선항목 ${idx + 1}`,
        desc: item.desc || item.description || "",
        emoji: item.emoji || "🛠",
        badge: item.badge || "개선 필요",
        badgeClass: item.badgeClass || "badge-warn",
      }));
    }

    function normalizeInsights(json = {}) {
      const raw = json.strategic_insights || json.insights || [];

      if (raw.length) {
        return raw.map((item, idx) => ({
          title: item.title || `인사이트 ${idx + 1}`,
          desc: item.desc || item.description || "",
          emoji: item.emoji || "💡",
        }));
      }

      return [
        {
          title: "리뷰 기반 인사이트",
          desc:
            json.executive_summary?.summary ||
            json.executive_summary ||
            "리뷰 기반 핵심 인사이트가 생성되었습니다.",
          emoji: "💡",
        },
      ];
    }

    function normalizeActions(json = {}) {
      const raw = json.action_plan || json.action_plans || json.actions || [];

      return raw.map((item, idx) => {
        const priority =
          item.priority || (idx === 0 ? "HIGH" : idx === 1 ? "MEDIUM" : "LOW");

        return {
          label:
            priority === "HIGH"
              ? "High"
              : priority === "MEDIUM"
                ? "Med"
                : "Low",
          cls:
            priority === "HIGH"
              ? "high"
              : priority === "MEDIUM"
                ? "medium"
                : "low",
          title: item.title || `실행 과제 ${idx + 1}`,
          desc: item.desc || item.description || "",
          tags:
            item.tags || (item.expected_effect ? [item.expected_effect] : []),
          deadline: item.deadline || item.timeline || "TBD",
        };
      });
    }

    function normalizeSegments(json = {}) {
      const seg = json.segments || [];
      if (seg.length) {
        return seg.map((item) => ({
          label: item.label,
          val: item.val,
          delta: item.delta || "",
          trend: item.trend || "up",
        }));
      }

      return [{ label: "평균 객단가", val: "₩42,000", delta: "", trend: "up" }];
    }

    function buildNps(cxJson = {}) {
      const score = Number(
        cxJson.kpi?.nps ?? cxJson.nps?.score ?? cxJson.nps ?? 0,
      );
      const promoters = Number(
        cxJson.nps?.promoters ?? cxJson.kpi?.promoters ?? 0,
      );
      const passives = Number(
        cxJson.nps?.passives ?? cxJson.kpi?.passives ?? 100,
      );
      const detractors = Number(
        cxJson.nps?.detractors ?? cxJson.kpi?.detractors ?? 0,
      );

      return { score, promoters, passives, detractors };
    }

    function adaptCxReport(
      cxJson,
      currentStore,
      from,
      to,
    ) {
      const overallRating = Number(cxJson.rating ?? cxJson.overall_rating ?? 0);
      const sentiment = normalizeSentiment(
        cxJson.kpi?.sentiment || cxJson.sentiment || {},
      );
      const reviewCount = Number(cxJson.review_count ?? 0);

      return {
        period: {
          start: from,
          end: to,
        },
        execSummary:
          cxJson.executive_summary?.summary ||
          cxJson.executive_summary ||
          "분석 요약이 없습니다.",
        pillars: [
          {
            type: "strength",
            label: "주요 강점",
            val:
              (cxJson.drivers_of_satisfaction || [])
                .slice(0, 3)
                .map((v) => v.name || v.label || v)
                .join(" · ") || "데이터 없음",
          },
          {
            type: "issue",
            label: "주요 개선점",
            val:
              (cxJson.areas_for_improvement || [])
                .slice(0, 3)
                .map((v) => v.name || v.label || v)
                .join(" · ") || "데이터 없음",
          },
          {
            type: "opportunity",
            label: "핵심 기회",
            val:
              cxJson.executive_summary?.opportunity ||
              "데이터 기반 기회 요약 없음",
          },
        ],
        overallRating,
        ratingPct: Math.round((overallRating / 5) * 100),
        sentiment,
        nps: buildNps(cxJson),
        reviewCount,
        ratingDist: (cxJson.rating_distribution || []).map((item) => ({
          stars: Number(item.stars),
          count: Number(item.count),
        })),
        dailyRatings: (cxJson.rating_trend_daily || []).map((d) => ({
          d: d.date,
          r: Number(d.avg_rating ?? 0),
        })),
        monthlyRatings: (cxJson.rating_trend_monthly || []).map((d) => ({
          d: d.date,
          r: Number(d.avg_rating ?? 0),
        })),
        keywords: normalizeKeywords(cxJson),
        segments: normalizeSegments(cxJson),
        drivers: normalizeDrivers(cxJson.drivers_of_satisfaction),
        improvements: normalizeImprovements(cxJson.areas_for_improvement),
        insights: normalizeInsights(cxJson),
        actions: normalizeActions(cxJson),
      };
    }

    function riskToVisitFreq(risk) {
      if (risk === "HIGH") return "월 1회";
      if (risk === "MEDIUM") return "월 2회";
      return "월 3회+";
    }

    function sentimentTags(customer) {
      const tags = [];
      if (customer.sentiment) {
        tags.push(
          customer.sentiment === "positive"
            ? "긍정 리뷰"
            : customer.sentiment === "negative"
              ? "부정 리뷰"
              : "중립 리뷰",
        );
      }
      if (customer.risk_level === "HIGH") tags.push("이탈 위험");
      if (Number(customer.total_reviews ?? 0) >= 3) tags.push("반복 방문");
      if (Number(customer.avg_rating ?? 0) >= 4) tags.push("고평점");
      return tags.length ? tags : ["리뷰 고객"];
    }

    function adaptCustomers(customerJson) {
      const summary = customerJson.summary || {};
      const riskDistribution = customerJson.risk_distribution || {};
      const visitFrequencyDistribution =
        customerJson.visit_frequency_distribution || {};
      const segments = customerJson.segments || {};
      const cohort = customerJson.cohort || {};

      return {
        summary: {
          totalCustomers: {
            current: Number(summary.total_customers?.current ?? 0),
            previous: Number(summary.total_customers?.previous ?? 0),
            delta_pct: Number(summary.total_customers?.delta_pct ?? 0),
          },
          atRiskCustomers: {
            current: Number(summary.at_risk_customers?.current ?? 0),
            previous: Number(summary.at_risk_customers?.previous ?? 0),
            delta_pct: Number(summary.at_risk_customers?.delta_pct ?? 0),
          },
          avgSatisfaction: {
            current: Number(summary.avg_satisfaction?.current ?? 0),
            previous: Number(summary.avg_satisfaction?.previous ?? 0),
            delta_pct: Number(summary.avg_satisfaction?.delta_pct ?? 0),
          },
          repeatVisitRate: {
            current: Number(summary.repeat_visit_rate?.current ?? 0),
            previous: Number(summary.repeat_visit_rate?.previous ?? 0),
            delta_pct: Number(summary.repeat_visit_rate?.delta_pct ?? 0),
          },
        },

        riskDistribution: {
          high: {
            count: Number(riskDistribution.high?.count ?? 0),
            pct: Number(riskDistribution.high?.pct ?? 0),
            avg_churn_pct: Number(riskDistribution.high?.avg_churn_pct ?? 0),
          },
          medium: {
            count: Number(riskDistribution.medium?.count ?? 0),
            pct: Number(riskDistribution.medium?.pct ?? 0),
          },
          low: {
            count: Number(riskDistribution.low?.count ?? 0),
            pct: Number(riskDistribution.low?.pct ?? 0),
          },
        },

        visitFrequencyDistribution: {
          weekly_plus: Number(visitFrequencyDistribution.weekly_plus ?? 0),
          monthly_2: Number(visitFrequencyDistribution.monthly_2 ?? 0),
          monthly_1: Number(visitFrequencyDistribution.monthly_1 ?? 0),
          occasional: Number(visitFrequencyDistribution.occasional ?? 0),
          first_visit: Number(visitFrequencyDistribution.first_visit ?? 0),
          repeat_intent_rate: Number(
            visitFrequencyDistribution.repeat_intent_rate ?? 0,
          ),
        },

        segments: {
          loyal: {
            count: Number(segments.loyal?.count ?? 0),
            share_pct: Number(segments.loyal?.share_pct ?? 0),
            avg_rating: Number(segments.loyal?.avg_rating ?? 0),
          },
          new: {
            count: Number(segments.new?.count ?? 0),
            share_pct: Number(segments.new?.share_pct ?? 0),
            avg_rating: Number(segments.new?.avg_rating ?? 0),
            conversion_rate: Number(segments.new?.conversion_rate ?? 0),
          },
          at_risk: {
            count: Number(segments.at_risk?.count ?? 0),
            share_pct: Number(segments.at_risk?.share_pct ?? 0),
            avg_rating: Number(segments.at_risk?.avg_rating ?? 0),
            churn_probability: Number(segments.at_risk?.churn_probability ?? 0),
          },
          reactivation: {
            count: Number(segments.reactivation?.count ?? 0),
            share_pct: Number(segments.reactivation?.share_pct ?? 0),
            avg_rating: Number(segments.reactivation?.avg_rating ?? 0),
            reactivation_probability: Number(
              segments.reactivation?.reactivation_probability ?? 0,
            ),
          },
          insights: Array.isArray(segments.insights) ? segments.insights : [],
        },

        cohort: {
          rows: Array.isArray(cohort.rows) ? cohort.rows : [],
          summary_text: cohort.summary_text || "",
        },

        list: (customerJson.customers || []).map((c, idx) => ({
          id: `${c.author_name || "customer"}-${idx}`,
          name: c.author_name || "익명 고객",
          reviewCount: Number(c.total_reviews ?? 0),
          reviews: Number(c.total_reviews ?? 0),
          rating: Number(c.avg_rating ?? 0),
          lastActivity: c.last_review_at || "-",
          sentiment: c.sentiment || "neutral",
          churnPct: Math.round(Number(c.churn_probability ?? 0) * 100),
          risk: c.risk_level || "LOW",
          visitFreq: c.visit_frequency_label || riskToVisitFreq(c.risk_level),
          avgSpend: c.avg_spend ?? null,
          tags:
            Array.isArray(c.tags) && c.tags.length ? c.tags : sentimentTags(c),
        })),
      };
    }

    const maxDistCount = computed(() => {
      const dist = report.value?.ratingDist || [];
      if (!dist.length) return 1;
      return Math.max(...dist.map((d) => d.count), 1);
    });

    async function buildLineChart(
      canvasId = "ratingTrendChart",
      target = "trend",
    ) {
      await nextTick();
      const canvas = document.getElementById(canvasId);
      if (!canvas || !report.value) return;

      if (target === "trend") {
        destroyChart(lineChart);
      } else {
        destroyChart(summaryLineChart);
      }

      const raw =
        chartMode.value === "daily"
          ? report.value.dailyRatings || []
          : report.value.monthlyRatings || [];

      const labels = raw.map((d) => d.d);
      const vals = raw.map((d) => d.r);

      if (!vals.length) return;

      const minIdx = vals.indexOf(Math.min(...vals));

      const chart = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "평균 평점",
              data: vals,
              borderColor: "#6366f1",
              backgroundColor: "rgba(99,102,241,.06)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.45,
              pointRadius: vals.map((_, i) => (i === minIdx ? 7 : 4)),
              pointBackgroundColor: vals.map((_, i) =>
                i === minIdx ? "#f43f5e" : "#6366f1",
              ),
              pointBorderColor: "#fff",
              pointBorderWidth: 2.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f172a",
              titleFont: { size: 12, family: "Inter", weight: "600" },
              bodyFont: { size: 13, family: "Inter" },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` 평점: ${Number(ctx.parsed.y).toFixed(1)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 11, family: "Inter" }, color: "#94a3b8" },
            },
            y: {
              min: 1,
              max: 5,
              grid: { color: "#f1f5f9" },
              border: { display: false },
              ticks: {
                stepSize: 1,
                font: { size: 11, family: "Inter" },
                color: "#94a3b8",
              },
            },
          },
        },
      });

      if (target === "trend") {
        lineChart = chart;
      } else {
        summaryLineChart = chart;
      }
    }

    async function buildDonutChart() {
      await nextTick();
      const canvas = document.getElementById("sentimentDonutChart");
      if (!canvas || !report.value) return;

      destroyChart(donutChart);

      const s = report.value.sentiment || {
        positive: 0,
        neutral: 0,
        negative: 0,
      };

      donutChart = new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: ["긍정", "중립", "부정"],
          datasets: [
            {
              data: [s.positive, s.neutral, s.negative],
              backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"],
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "74%",
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f172a",
              padding: 10,
              cornerRadius: 8,
            },
          },
        },
      });
    }

    function formatDateLocal(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function getDefaultDateRange() {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);

      return {
        from: formatDateLocal(start),
        to: formatDateLocal(end),
      };
    }

    async function loadReport() {
      loading.value = true;
      error.value = "";

      try {
        const defaults = getDefaultDateRange();
        const from = route.query.from || route.query.start || defaults.from;
        const to = route.query.to || route.query.end || defaults.to;
        const periodType = route.query.periodType || null;

        const [cxJson, customerJson] = await Promise.all([
          analyzeCx(storeId, from, to, periodType),
          getCustomers(storeId, from, to),
        ]);

        report.value = adaptCxReport(
          cxJson,
          store,
          from,
          to,
        );
        customers.value = adaptCustomers(customerJson);

        loading.value = false;
        await nextTick();

        if (isMobileStackMode.value) {
          await buildLineChart("summaryRatingTrendChart", "summary");
          await buildDonutChart();
          await buildLineChart("ratingTrendChart", "trend");
        } else {
          if (activeTab.value === "rating") await buildDonutChart();
          if (activeTab.value === "summary") {
            await buildLineChart("summaryRatingTrendChart", "summary");
          }
          if (activeTab.value === "trend") {
            await buildLineChart("ratingTrendChart", "trend");
          }
        }
      } catch (e) {
        console.error(e);
        error.value = e.message || "보고서 데이터를 불러오지 못했습니다.";
        loading.value = false;
      }
    }

    watch(activeTab, async (tab) => {
      if (!report.value || isMobileStackMode.value) return;

      if (tab === "trend") await buildLineChart("ratingTrendChart", "trend");
      if (tab === "rating") await buildDonutChart();
      if (tab === "summary") {
        await buildLineChart("summaryRatingTrendChart", "summary");
      }
    });

    watch(chartMode, async () => {
      if (!report.value) return;

      await buildLineChart("summaryRatingTrendChart", "summary");

      if (isMobileStackMode.value || activeTab.value === "trend") {
        await buildLineChart("ratingTrendChart", "trend");
      }
    });

    watch(isMobileStackMode, async (isMobile) => {
      if (!report.value) return;

      await nextTick();

      if (isMobile) {
        await buildLineChart("summaryRatingTrendChart", "summary");
        await buildDonutChart();
        await buildLineChart("ratingTrendChart", "trend");
      } else {
        if (activeTab.value === "summary") {
          await buildLineChart("summaryRatingTrendChart", "summary");
        }
        if (activeTab.value === "rating") {
          await buildDonutChart();
        }
        if (activeTab.value === "trend") {
          await buildLineChart("ratingTrendChart", "trend");
        }
      }
    });

    onMounted(() => {
      window.addEventListener("resize", handleResize);
      handleResize();
      loadReport();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);
      destroyChart(lineChart);
      destroyChart(summaryLineChart);
      destroyChart(donutChart);
    });

    function printReport() {
      window.print();
    }

    function rankClass(i) {
      return i === 0
        ? "rank-gold"
        : i === 1
          ? "rank-silver"
          : i === 2
            ? "rank-bronze"
            : "rank-other";
    }

    return {
      store,
      report,
      loading,
      error,
      activeTab,
      chartMode,
      NAV_ITEMS,
      maxDistCount,
      starsStr,
      fmtDate,
      rankClass,
      printReport,
      router,
      customers,
      keywordTab,
      viewportWidth,
      isMobileStackMode,
      isVisible,
      loadingTheme: LOADING_THEME,
    };
  },

  template: `
    <div>
      <NavBar page="report"/>
      <div class="report-shell">
        <div class="report-layout">

          <!-- 좌측 사이드바 -->
          <aside v-if="!isMobileStackMode" class="report-sidenav">
            <div class="sidenav-store-info">
              <div class="sidenav-store-name">{{store.name}}</div>
              <div class="sidenav-period" v-if="report">{{fmtDate(report.period.start)}} ~ {{fmtDate(report.period.end)}}</div>
            </div>

            <div class="sidenav-section-label">보고서 섹션</div>

            <template v-for="item in NAV_ITEMS.filter(item => !item.hidden)" :key="item.id">
              <div v-if="item.divider" class="sidenav-divider"></div>

              <button
                :class="['sidenav-item', activeTab===item.id?'active':'', item.divider?'sidenav-item-highlight':'']"
                @click="activeTab=item.id"
              >
                <span class="sni">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path :d="item.icon"/>
                  </svg>
                </span>
                {{item.label}}
                <span v-if="item.divider" class="sni-badge">NEW</span>
              </button>
            </template>

            <div class="sidenav-export">
              <button class="sidenav-export-btn" @click="printReport">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                PDF 보고서 출력
              </button>
            </div>
          </aside>

          <!-- 메인 콘텐츠 -->
          <main class="report-content" v-if="!loading && report">

            <!-- 상단 매장 배너 -->
            <div class="store-banner">
              <div class="sb-avatar">🏪</div>

              <div class="sb-info">
                <div class="sb-name">{{store.name}}</div>

                <div class="sb-meta">
                  <span class="sb-chip sb-chip-active">
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                      <circle cx="3" cy="3" r="3"/>
                    </svg>
                    운영중
                  </span>

                  <span class="sb-chip">
                    <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {{store.address.split(',').slice(-2).join(',').trim()}}
                  </span>

                  <span class="sb-chip">
                    <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    {{fmtDate(report.period.start)}} ~ {{fmtDate(report.period.end)}}
                  </span>
                </div>
              </div>

              <div class="sb-actions">
                <button class="sb-btn sb-btn-glass" @click="router.push('/stores')">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                  매장 변경
                </button>

                <button class="sb-btn sb-btn-solid" @click="printReport">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  PDF 출력
                </button>
              </div>
            </div>

            <!-- 상단 KPI 카드 -->
            <div class="kpi-row">
              <div class="kpi-tile kpi-brand">
                <div class="kpi-icon-wrap ic-brand">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                </div>
                <div class="kpi-lbl">종합 평점</div>
                <div class="kpi-val" style="color:var(--brand-600)">
                  {{report.overallRating}}
                  <span style="font-size:16px;color:var(--text-4);font-weight:500">/5.0</span>
                </div>
                <div class="kpi-sub">{{report.reviewCount}}개 데이터 기준</div>
              </div>

              <div class="kpi-tile kpi-green">
                <div class="kpi-icon-wrap ic-emerald">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="kpi-lbl">긍정 비율</div>
                <div class="kpi-val" style="color:var(--accent-emerald)">{{report.sentiment.positive}}%</div>
                <div class="kpi-sub">감성 분석 기준</div>
              </div>

              <div class="kpi-tile kpi-purple">
                <div class="kpi-icon-wrap ic-violet">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
                <div class="kpi-lbl">NPS Score</div>
                <div class="kpi-val" style="color:var(--accent-violet)">{{report.nps.score}}</div>
                <div class="kpi-sub">Passives 구간</div>
              </div>

              <div class="kpi-tile kpi-amber">
                <div class="kpi-icon-wrap ic-amber">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <div class="kpi-lbl">총 리뷰 수</div>
                <div class="kpi-val" style="color:var(--accent-amber)">
                  {{report.reviewCount.toLocaleString()}}
                  <span style="font-size:15px;color:var(--text-4);font-weight:500">개</span>
                </div>
                <div class="kpi-sub">리뷰 수</div>
              </div>
            </div>

            <!-- Executive Summary 상단 평점 추이 카드 -->
            <div v-show="isVisible('summary')" class="r-card summary-trend-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-sky">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  평점 점수 추이
                </div>

                <div class="chart-toolbar">
                  <div class="chart-toggle">
                    <button :class="['ct-btn',chartMode==='daily'?'active':'']" @click="chartMode='daily'">일별</button>
                    <button :class="['ct-btn',chartMode==='monthly'?'active':'']" @click="chartMode='monthly'">월별</button>
                  </div>
                </div>
              </div>

              <div class="r-card-body">
                <div class="chart-container summary-chart-container">
                  <canvas id="summaryRatingTrendChart"></canvas>
                </div>

                <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-4)">
                  <span style="display:flex;align-items:center;gap:5px">
                    <span style="width:10px;height:10px;border-radius:50%;background:var(--brand-500);display:inline-block"></span>
                    평균 평점
                  </span>
                  <span style="display:flex;align-items:center;gap:5px">
                    <span style="width:10px;height:10px;border-radius:50%;background:#f43f5e;display:inline-block"></span>
                    급변 구간 (최저점)
                  </span>
                </div>
              </div>
            </div>

            <!-- Executive Summary -->
            <div v-show="isVisible('summary')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-brand">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  Executive Summary
                </div>

                <span class="chip chip-brand">{{fmtDate(report.period.start)}} ~ {{fmtDate(report.period.end)}}</span>
              </div>

              <div class="r-card-body">
                <div class="exec-quote">{{report.execSummary}}</div>

                <div class="exec-pillars">
                  <div
                    v-for="p in report.pillars"
                    :key="p.type"
                    :class="['exec-pillar','ep-'+p.type]"
                  >
                    <div class="ep-label">{{p.label}}</div>
                    <div class="ep-val">{{p.val}}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Overall Rating -->
            <div v-show="isVisible('rating')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-amber">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                  </div>
                  Overall Rating
                </div>
              </div>

              <div class="r-card-body">
                <div class="rating-layout">
                  <div class="rating-big-wrap">
                    <div class="rating-ring" :style="{'--pct': (report.ratingPct)+'%'}">
                      <div class="rating-ring-inner">
                        <div class="rating-big-num">{{report.overallRating}}</div>
                        <div class="rating-big-denom">/ 5.0</div>
                      </div>
                    </div>

                    <div class="rating-stars-row">{{starsStr(Math.round(report.overallRating))}}</div>
                    <div class="rating-cnt">{{report.reviewCount}}개 리뷰 기준</div>
                  </div>

                  <div class="rating-bars-wrap">
                    <div v-for="item in [...report.ratingDist].reverse()" :key="item.stars" class="rbar-row">
                      <span class="rbar-label">{{item.stars}}</span>
                      <span class="rbar-stars">{{'★'.repeat(item.stars)}}</span>
                      <div class="rbar-track">
                        <div class="rbar-fill" :style="{width:(item.count/maxDistCount*100)+'%'}"></div>
                      </div>
                      <span class="rbar-cnt">{{item.count}}</span>
                    </div>
                  </div>
                </div>

                <div class="divider"></div>

                <div style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:16px">Sentiment Analysis</div>

                <div class="sentiment-layout">
                  <div style="position:relative;height:200px">
                    <canvas id="sentimentDonutChart"></canvas>
                  </div>

                  <div class="sentiment-pills">
                    <div class="sent-item">
                      <div class="sent-dot" style="background:#10b981"></div>
                      <span class="sent-label">긍정 (Positive)</span>
                      <span class="sent-pct" style="color:#10b981">{{report.sentiment.positive}}%</span>
                    </div>

                    <div class="sent-item">
                      <div class="sent-dot" style="background:#f59e0b"></div>
                      <span class="sent-label">중립 (Neutral)</span>
                      <span class="sent-pct" style="color:#f59e0b">{{report.sentiment.neutral}}%</span>
                    </div>

                    <div class="sent-item">
                      <div class="sent-dot" style="background:#f43f5e"></div>
                      <span class="sent-label">부정 (Negative)</span>
                      <span class="sent-pct" style="color:#f43f5e">{{report.sentiment.negative}}%</span>
                    </div>
                  </div>
                </div>

                <div class="divider"></div>
              </div>
            </div>

            <!-- 키워드 워드클라우드 -->
            <div v-show="isVisible('keyword')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-violet">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M7 18a4.6 4.6 0 01.88-9.117A5.5 5.5 0 0118.5 10a3.5 3.5 0 010 7H7z"/>
                    </svg>
                  </div>
                  키워드 워드클라우드
                </div>

                <div class="wc-tabs">
                  <button
                    :class="['wc-tab-btn', keywordTab==='positive' ? 'active' : '']"
                    @click="keywordTab='positive'"
                  >
                    긍정
                  </button>

                  <button
                    :class="['wc-tab-btn', keywordTab==='negative' ? 'active' : '']"
                    @click="keywordTab='negative'"
                  >
                    부정
                  </button>

                  <button
                    :class="['wc-tab-btn', keywordTab==='all' ? 'active' : '']"
                    @click="keywordTab='all'"
                  >
                    전체
                  </button>
                </div>
              </div>

              <div class="r-card-body">
                <div class="wc-cloud">
                  <span
                    v-for="word in (report.keywords?.[keywordTab] || [])"
                    :key="keywordTab + '-' + word.text"
                    :class="[
                      'wc-word',
                      word.tone === 'pos' ? 'wc-word-pos' : word.tone === 'neg' ? 'wc-word-neg' : 'wc-word-all'
                    ]"
                    :style="{ fontSize: word.size + 'px' }"
                  >
                    {{ word.text }}
                  </span>
                </div>

                <div v-if="!(report.keywords?.[keywordTab] || []).length" class="wc-empty">
                  키워드 데이터가 없습니다.
                </div>
              </div>
            </div>

            <!-- Segment Analysis -->
            <div v-show="isVisible('segment')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-violet">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
                    </svg>
                  </div>
                  Segment Analysis
                </div>
              </div>

              <div class="r-card-body">
                <div class="segment-grid">
                  <div v-for="seg in report.segments" :key="seg.label" class="seg-tile">
                    <div class="seg-label">{{seg.label}}</div>
                    <div class="seg-val">{{seg.val}}</div>
                    <div :class="['seg-trend', seg.trend==='up'?'t-up':'t-down']">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path :d="seg.trend==='up'?'M5 15l7-7 7 7':'M19 9l-7 7-7-7'"/>
                      </svg>
                      {{seg.delta}} 전월 대비
                    </div>
                  </div>
                </div>

                <div class="divider"></div>

                <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:14px">고객 유형 분포</div>

                <div class="seg-bar-area">
                  <div class="seg-bar-row">
                    <span class="seg-bar-lbl">신규 고객</span>
                    <div class="seg-bar-track">
                      <div class="seg-bar-fill-a" style="width:38%"></div>
                    </div>
                    <span style="font-size:13px;font-weight:700;color:var(--brand-600);width:36px;text-align:right">38%</span>
                  </div>

                  <div class="seg-bar-row">
                    <span class="seg-bar-lbl">재방문 고객</span>
                    <div class="seg-bar-track">
                      <div class="seg-bar-fill-b" style="width:62%"></div>
                    </div>
                    <span style="font-size:13px;font-weight:700;color:var(--accent-emerald);width:36px;text-align:right">62%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- NPS -->
            <div v-show="isVisible('nps')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-rose">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </div>
                  Recommendation (NPS)
                </div>
              </div>

              <div class="r-card-body">
                <div class="nps-layout">
                  <div class="nps-gauge">
                    <div :class="['nps-big', report.nps.score>=9?'nps-promoter-c':report.nps.score>=7?'nps-passive-c':'nps-detractor-c']">
                      {{report.nps.score}}
                    </div>
                    <div class="nps-label">NPS Score</div>
                    <div class="nps-scale-desc">9–10: Promoters<br>7–8: Passives<br>0–6: Detractors</div>
                  </div>

                  <div class="nps-bands">
                    <div class="nps-band nps-band-promoter">
                      <div class="nps-band-hd">
                        <span class="nps-band-name">🟢 Promoters (9–10)</span>
                        <span class="nps-band-pct">{{report.nps.promoters}}%</span>
                      </div>
                      <div class="nps-band-track">
                        <div class="nps-band-fill nps-pf-pro" :style="{width:report.nps.promoters+'%'}"></div>
                      </div>
                      <p class="nps-band-desc">추천 및 재방문 의사가 높은 충성 고객군</p>
                    </div>

                    <div class="nps-band nps-band-passive">
                      <div class="nps-band-hd">
                        <span class="nps-band-name">🟡 Passives (7–8)</span>
                        <span class="nps-band-pct">{{report.nps.passives}}%</span>
                      </div>
                      <div class="nps-band-track">
                        <div class="nps-band-fill nps-pf-pas" :style="{width:report.nps.passives+'%'}"></div>
                      </div>
                      <p class="nps-band-desc">무난한 만족 수준, 이탈 가능성 잠재</p>
                    </div>

                    <div class="nps-band nps-band-detractor">
                      <div class="nps-band-hd">
                        <span class="nps-band-name">🔴 Detractors (0–6)</span>
                        <span class="nps-band-pct">{{report.nps.detractors}}%</span>
                      </div>
                      <div class="nps-band-track">
                        <div class="nps-band-fill nps-pf-det" :style="{width:report.nps.detractors+'%'}"></div>
                      </div>
                      <p class="nps-band-desc">불만 고객, 이탈 위험 — 즉각 대응 필요</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 평점 추이 -->
            <div v-show="isVisible('trend')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-sky">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  평점 점수 추이
                </div>

                <div class="chart-toolbar">
                  <div class="chart-toggle">
                    <button :class="['ct-btn',chartMode==='daily'?'active':'']" @click="chartMode='daily'">일별</button>
                    <button :class="['ct-btn',chartMode==='monthly'?'active':'']" @click="chartMode='monthly'">월별</button>
                  </div>
                </div>
              </div>

              <div class="r-card-body">
                <div class="chart-container">
                  <canvas id="ratingTrendChart"></canvas>
                </div>

                <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-4)">
                  <span style="display:flex;align-items:center;gap:5px">
                    <span style="width:10px;height:10px;border-radius:50%;background:var(--brand-500);display:inline-block"></span>
                    평균 평점
                  </span>
                  <span style="display:flex;align-items:center;gap:5px">
                    <span style="width:10px;height:10px;border-radius:50%;background:#f43f5e;display:inline-block"></span>
                    급변 구간 (최저점)
                  </span>
                </div>
              </div>
            </div>

            <!-- Key Drivers -->
            <div v-show="isVisible('drivers')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-emerald">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                  </div>
                  🔥 Key Drivers of Satisfaction
                </div>
              </div>

              <div class="r-card-body">
                <p style="font-size:14px;color:var(--text-3);margin-bottom:18px;line-height:1.65">
                  고객 만족도를 높이는 핵심 요인입니다. 전략적으로 강화해야 할 우선 영역입니다.
                </p>

                <div class="driver-list">
                  <div v-for="(d,i) in report.drivers" :key="d.name" class="driver-row">
                    <div :class="['driver-rank', rankClass(i)]">{{i+1}}</div>
                    <div class="driver-emoji">{{d.emoji}}</div>
                    <div class="driver-mid">
                      <div class="driver-name">{{d.name}}</div>
                      <div class="driver-track">
                        <div class="driver-fill" :style="{width:d.pct+'%'}"></div>
                      </div>
                    </div>
                    <div class="driver-pct-label">{{d.pct}}%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Improvements -->
            <div v-show="isVisible('improve')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-amber">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  🛠 Areas for Improvement
                </div>
              </div>

              <div class="r-card-body">
                <p style="font-size:14px;color:var(--text-3);margin-bottom:18px;line-height:1.65">
                  고객 불만이 집중된 영역입니다. 즉각적인 개선 조치가 필요합니다.
                </p>

                <div class="improve-list">
                  <div v-for="imp in report.improvements" :key="imp.name" class="improve-row">
                    <div class="improve-icon">{{imp.emoji}}</div>
                    <div class="improve-body">
                      <div class="improve-name">{{imp.name}}</div>
                      <div class="improve-desc">{{imp.desc}}</div>
                    </div>
                    <div :class="['improve-badge',imp.badgeClass]">{{imp.badge}}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Insights -->
            <div v-show="isVisible('insights')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-brand">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  AI Strategic Insights
                </div>

                <span class="chip chip-neutral" style="font-size:11px">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  GPT 분석
                </span>
              </div>

              <div class="r-card-body">
                <div class="insight-grid">
                  <div v-for="ins in report.insights" :key="ins.title" class="insight-row">
                    <div class="insight-icon-wrap">{{ins.emoji}}</div>
                    <div class="insight-text">
                      <h4>{{ins.title}}</h4>
                      <p>{{ins.desc}}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Plan -->
            <div v-show="isVisible('action')" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-sky">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                  </div>
                  Action Plan
                </div>

                <div style="display:flex;gap:6px">
                  <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:var(--r-full);background:#fef2f2;color:#dc2626">High</span>
                  <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:var(--r-full);background:#fffbeb;color:#d97706">Med</span>
                  <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:var(--r-full);background:#f0fdf4;color:#16a34a">Low</span>
                </div>
              </div>

              <div class="r-card-body">
                <div class="action-list">
                  <div v-for="act in report.actions" :key="act.title" class="action-row">
                    <div :class="['action-dot',act.cls]">{{act.label}}</div>
                    <div class="action-body">
                      <div class="action-title">{{act.title}}</div>
                      <div class="action-desc">{{act.desc}}</div>

                      <div class="action-meta-row">
                        <span v-for="tag in act.tags" :key="tag" class="action-tag">{{tag}}</span>
                        <span class="action-deadline">
                          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {{act.deadline}}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Customer Analysis -->
            <div v-show="isVisible('customers')">
              <CustomerPage
                :store="store"
                :period="report?.period || {}"
                :customers="customers"
                :loading="loading"
                :error="error"
              />
            </div>
          </main>

          <!-- 에러 상태 -->
          <div v-if="!loading && error" class="report-content">
            <div class="loading-overlay">
              <p class="loader-text" style="color:#ef4444">{{ error }}</p>
            </div>
          </div>

          <!-- 로딩 상태 -->
          <div
            v-if="loading"
            class="report-content"
            style="position:relative; min-height:calc(100vh - 120px);"
          >
            <div
              :class="['b2b-report-loading', 'tone-' + loadingTheme.tone]"
              aria-live="polite"
              aria-busy="true"
            >
              <div class="b2b-report-loading-backdrop-grid"></div>

              <div class="b2b-report-loading-anchor">
                <div class="b2b-report-loading-beam"></div>

                <div class="b2b-report-loading-orb" aria-hidden="true">
                  <span class="b2b-report-loading-halo halo-outer"></span>
                  <span class="b2b-report-loading-halo halo-inner"></span>

                  <span class="b2b-report-loading-ring ring-primary"></span>
                  <span class="b2b-report-loading-ring ring-secondary"></span>
                  <span class="b2b-report-loading-ring ring-tertiary"></span>

                  <span class="b2b-report-loading-core"></span>
                  <span class="b2b-report-loading-core-gloss"></span>

                  <span class="b2b-report-loading-particle particle-a"></span>
                  <span class="b2b-report-loading-particle particle-b"></span>
                  <span class="b2b-report-loading-particle particle-c"></span>
                </div>

                <div class="b2b-report-loading-copy">
                  <div class="b2b-report-loading-kicker">{{ loadingTheme.kicker }}</div>
                  <div class="b2b-report-loading-title">{{ loadingTheme.title }}</div>
                  <div class="b2b-report-loading-desc">{{ loadingTheme.desc }}</div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  `,
});