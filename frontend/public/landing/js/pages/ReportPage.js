const {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watch
} = Vue;

const { useRouter, useRoute } = VueRouter;

import { STORES } from '../data/stores.js';
import { fmtDate, starsStr } from '../utils/helpers.js';
import { destroyChart } from '../utils/charts.js';
import { NavBar } from '../components/NavBar.js';
import { analyzeCx, getRatingTrend } from '../api/reports.js';
import { getCustomers } from '../api/customers.js';

export const ReportPage = defineComponent({
  name: 'ReportPage',
  components: { NavBar },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const storeId = route.params.id;
    const store = STORES.find(s => s.id === storeId) || STORES[0];

    const loading = ref(true);
    const error = ref('');
    const activeTab = ref('summary');
    const chartMode = ref('daily');

    const report = ref(null);
      const customers = ref({
        summary: {
          totalCustomers: { current: 0, previous: 0, delta_pct: 0 },
          atRiskCustomers: { current: 0, previous: 0, delta_pct: 0 },
          avgSatisfaction: { current: 0, previous: 0, delta_value: 0 },
          repeatVisitRate: { current: 0, previous: 0, delta_pct: 0 },
        },
        riskDistribution: {},
        visitFrequencyDistribution: {},
        segments: {},
        cohort: { rows: [], summary_text: "" },
        list: [],
      });

    let lineChart = null;
    let donutChart = null;

    const custSubTab = ref('overview');
    const custSearch = ref('');
    const custRiskFilter = ref('ALL');
    const custSortBy = ref('churnPct');
    const expandedCustomer = ref(null);

    const NAV_ITEMS = [
      { id:'summary', label:'Executive Summary', icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id:'rating', label:'Overall Rating', icon:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
      { id:'segment', label:'Segment Analysis', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { id:'nps', label:'NPS Score', icon:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
      { id:'trend', label:'평점 추이', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { id:'drivers', label:'Key Drivers', icon:'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
      { id:'improve', label:'Improvements', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { id:'insights', label:'AI Insights', icon:'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
      { id:'action', label:'Action Plan', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { id:'customers', label:'고객 분석', icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', divider: true },
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
      const five = Math.round(safeCount * (avg >= 4.5 ? 0.62 : avg >= 4.0 ? 0.50 : 0.35));
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
      const pos = (json.positive_keywords || json.keywords?.positive || []).slice(0, 6);
      const neg = (json.negative_keywords || json.keywords?.negative || []).slice(0, 6);

      return {
        positive: pos.map((t, i) => ({ t, s: i < 2 ? 'lg' : i < 4 ? 'md' : 'sm' })),
        negative: neg.map((t, i) => ({ t, s: i < 2 ? 'lg' : i < 4 ? 'md' : 'sm' })),
      };
    }

      function normalizeDrivers(list = []) {
      return (list || []).slice(0, 5).map((item, idx) => ({
        name: item.name || item.label || `강점 ${idx + 1}`,
        pct: Number(item.pct ?? item.value ?? item.score ?? item.ratio ?? 0),
        emoji: item.emoji || '✨',
      }));
    }

    function normalizeImprovements(list = []) {
      return (list || []).slice(0, 5).map((item, idx) => ({
        name: item.name || item.label || `개선항목 ${idx + 1}`,
        desc: item.desc || item.description || '',
        emoji: item.emoji || '🛠',
        badge: item.badge || '개선 필요',
        badgeClass: item.badgeClass || 'badge-warn',
      }));
    }

        function normalizeInsights(json = {}) {
      const raw =
        json.strategic_insights ||
        json.insights ||
        [];

      if (raw.length) {
        return raw.map((item, idx) => ({
          title: item.title || `인사이트 ${idx + 1}`,
          desc: item.desc || item.description || '',
          emoji: item.emoji || '💡',
        }));
      }

      return [
        {
          title: '리뷰 기반 인사이트',
          desc:
            json.executive_summary?.summary ||
            json.executive_summary ||
            '리뷰 기반 핵심 인사이트가 생성되었습니다.',
          emoji: '💡',
        },
      ];
    }

    function normalizeActions(json = {}) {
      const raw = json.action_plan || json.action_plans || json.actions || [];

      return raw.map((item, idx) => {
        const priority = item.priority || (idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW');

        return {
          label:
            priority === 'HIGH' ? 'High' :
            priority === 'MEDIUM' ? 'Medium' : 'Low',

          cls:
            priority === 'HIGH' ? 'high' :
            priority === 'MEDIUM' ? 'medium' : 'low',

          title: item.title || `실행 과제 ${idx + 1}`,
          desc: item.desc || item.description || '',
          tags: item.tags || (item.expected_effect ? [item.expected_effect] : []),
          deadline: item.deadline || item.timeline || 'TBD',
        };
      });
    }

    function normalizeSegments(json = {}) {
      const seg = json.segments || [];
      if (seg.length) {
        return seg.map((item) => ({
          label: item.label,
          val: item.val,
          delta: item.delta || '',
          trend: item.trend || 'up',
        }));
      }

      return [
        { label: '평균 객단가', val: '₩42,000', delta: '+6%', trend: 'up' },
        { label: '재방문 의향', val: '78%', delta: '+4%', trend: 'up' },
        { label: '신규 고객', val: '24%', delta: '+2%', trend: 'up' },
        { label: '이탈 위험', val: '14%', delta: '-1%', trend: 'down' },
      ];
    }

    function buildNps(cxJson = {}) {
      const score = Number(cxJson.kpi?.nps ?? cxJson.nps?.score ?? cxJson.nps ?? 0);
      const promoters = Number(cxJson.nps?.promoters ?? cxJson.kpi?.promoters ?? 0);
      const passives = Number(cxJson.nps?.passives ?? cxJson.kpi?.passives ?? 100);
      const detractors = Number(cxJson.nps?.detractors ?? cxJson.kpi?.detractors ?? 0);

      return { score, promoters, passives, detractors };
    }

    function adaptCxReport(cxJson, trendDaily, trendMonthly, currentStore, from, to) {
      const overallRating = Number(cxJson.rating ?? cxJson.overall_rating ?? 0);
      const sentiment = normalizeSentiment(cxJson.kpi?.sentiment || cxJson.sentiment || {});
      const reviewCount = Number(cxJson.review_count ?? 0);

      return {
        period: {
          start: from,
          end: to,
        },
        execSummary:
          cxJson.executive_summary?.summary ||
          cxJson.executive_summary ||
          '분석 요약이 없습니다.',
        pillars: [
          {
            type: 'strength',
            label: '주요 강점',
            val: (cxJson.drivers_of_satisfaction || [])
              .slice(0, 3)
              .map(v => v.name || v.label || v)
              .join(' · ') || '데이터 없음',
          },
          {
            type: 'issue',
            label: '주요 개선점',
            val: (cxJson.areas_for_improvement || [])
              .slice(0, 3)
              .map(v => v.name || v.label || v)
              .join(' · ') || '데이터 없음',
          },
          {
            type: 'opportunity',
            label: '핵심 기회',
            val: cxJson.executive_summary?.opportunity || '데이터 기반 기회 요약 없음',
          },
        ],
        overallRating,
        ratingPct: Math.round((overallRating / 5) * 100),
        sentiment,
        nps: buildNps(cxJson),
        reviewCount,
        ratingDist: (cxJson.rating_distribution || []).map(item => ({
          stars: Number(item.stars),
          count: Number(item.count),
        })),
        dailyRatings: (trendDaily || []).map((d) => ({
          d: d.date,
          r: Number(d.avg_rating ?? 0),
        })),
        monthlyRatings: (trendMonthly || []).map((d) => ({
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
      if (risk === 'HIGH') return '월 1회';
      if (risk === 'MEDIUM') return '월 2회';
      return '월 3회+';
    }

    function sentimentTags(customer) {
      const tags = [];
      if (customer.sentiment) {
        tags.push(
          customer.sentiment === 'positive'
            ? '긍정 리뷰'
            : customer.sentiment === 'negative'
              ? '부정 리뷰'
              : '중립 리뷰'
        );
      }
      if (customer.risk_level === 'HIGH') tags.push('이탈 위험');
      if (Number(customer.total_reviews ?? 0) >= 3) tags.push('반복 방문');
      if (Number(customer.avg_rating ?? 0) >= 4) tags.push('고평점');
      return tags.length ? tags : ['리뷰 고객'];
    }

function adaptCustomers(customerJson) {
   console.log("customerJson", customerJson);

  const summary = customerJson.summary || {};
  const riskDistribution = customerJson.risk_distribution || {};
  const visitFrequencyDistribution = customerJson.visit_frequency_distribution || {};
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
        delta_value: Number(summary.avg_satisfaction?.delta_value ?? 0),
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
      repeat_intent_rate: Number(visitFrequencyDistribution.repeat_intent_rate ?? 0),
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
        reactivation_probability: Number(segments.reactivation?.reactivation_probability ?? 0),
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
      avgSpend: c.avg_spend || "₩40,000",
      tags: Array.isArray(c.tags) && c.tags.length ? c.tags : sentimentTags(c),
    })),
  };
}


    const visitFrequencyRows = computed(() => {
      const dist = customers.value?.visitFrequencyDistribution || {};

      return [
        { label: "주 1회+", pct: Number(dist.weekly_plus ?? 0), color: "#6366f1" },
        { label: "월 2회", pct: Number(dist.monthly_2 ?? 0), color: "#8b5cf6" },
        { label: "월 1회", pct: Number(dist.monthly_1 ?? 0), color: "#06b6d4" },
        { label: "가끔", pct: Number(dist.occasional ?? 0), color: "#f59e0b" },
        { label: "첫 방문", pct: Number(dist.first_visit ?? 0), color: "#f43f5e" },
      ];
    });


    const filteredCustomers = computed(() => {
      let list = customers.value?.list || [];

      if (custSearch.value) {
        const q = custSearch.value.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(q));
      }

      if (custRiskFilter.value !== 'ALL') {
        list = list.filter(c => c.risk === custRiskFilter.value);
      }

      return [...list].sort((a, b) => {
        if (custSortBy.value === 'churnPct') return b.churnPct - a.churnPct;
        if (custSortBy.value === 'rating') return a.rating - b.rating;
        if (custSortBy.value === 'lastActivity') return new Date(b.lastActivity) - new Date(a.lastActivity);
        return 0;
      });
    });

    function toggleCustomer(id) {
      expandedCustomer.value = expandedCustomer.value === id ? null : id;
    }

    const maxDistCount = computed(() => {
      const dist = report.value?.ratingDist || [];
      if (!dist.length) return 1;
      return Math.max(...dist.map(d => d.count), 1);
    });

    async function buildLineChart() {
      await nextTick();
      const canvas = document.getElementById('ratingTrendChart');
      if (!canvas || !report.value) return;

      destroyChart(lineChart);

      const raw =
        chartMode.value === 'daily'
          ? (report.value.dailyRatings || [])
          : (report.value.monthlyRatings || []);

      const labels = raw.map(d => d.d);
      const vals = raw.map(d => d.r);

      if (!vals.length) return;

      const minIdx = vals.indexOf(Math.min(...vals));

      lineChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: '평균 평점',
            data: vals,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,.06)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.45,
            pointRadius: vals.map((_, i) => i === minIdx ? 7 : 4),
            pointBackgroundColor: vals.map((_, i) => i === minIdx ? '#f43f5e' : '#6366f1'),
            pointBorderColor: '#fff',
            pointBorderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { size: 12, family: 'Inter', weight: '600' },
              bodyFont: { size: 13, family: 'Inter' },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: ctx => ` 평점: ${Number(ctx.parsed.y).toFixed(1)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8' }
            },
            y: {
              min: 1,
              max: 5,
              grid: { color: '#f1f5f9' },
              border: { display: false },
              ticks: { stepSize: 1, font: { size: 11, family: 'Inter' }, color: '#94a3b8' }
            }
          }
        }
      });
    }

    async function buildDonutChart() {
      await nextTick();
      const canvas = document.getElementById('sentimentDonutChart');
      if (!canvas || !report.value) return;

      destroyChart(donutChart);

      const s = report.value.sentiment || { positive: 0, neutral: 0, negative: 0 };

      donutChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['긍정', '중립', '부정'],
          datasets: [{
            data: [s.positive, s.neutral, s.negative],
            backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 }
          }
        }
      });
    }

    function formatDateLocal(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
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
      error.value = '';
      try {
        const defaults = getDefaultDateRange();
        const from = route.query.from || route.query.start || defaults.from;
        const to = route.query.to || route.query.end || defaults.to;
       console.log('route.query', route.query);
       console.log('used period', from, to);

        const [cxJson, trendDaily, trendMonthly, customerJson] = await Promise.all([
          analyzeCx(storeId, from, to),
          getRatingTrend(storeId, 'day', from, to),
          getRatingTrend(storeId, 'month', from, to),
          getCustomers(storeId, from, to),
        ]);
        console.log("Executive Summary", cxJson)
        console.log("getRatingTrend_day", trendDaily)
        console.log("getRatingTrend_month", trendMonthly)
        console.log("getCustomers", customerJson)
        

        report.value = adaptCxReport(cxJson, trendDaily, trendMonthly, store, from, to);
        customers.value = adaptCustomers(customerJson);

    

        await nextTick();

        if (activeTab.value === 'rating') await buildDonutChart();
        if (activeTab.value === 'trend') await buildLineChart();
      } catch (e) {
        console.error(e);
        error.value = e.message || '보고서 데이터를 불러오지 못했습니다.';
      } finally {
        loading.value = false;
      }
    }

    watch(activeTab, async (tab) => {
      if (!report.value) return;
      if (tab === 'trend') await buildLineChart();
      if (tab === 'rating') await buildDonutChart();
    });

    watch(chartMode, async () => {
      if (!report.value) return;
      await buildLineChart();
    });

    onMounted(loadReport);

    onUnmounted(() => {
      destroyChart(lineChart);
      destroyChart(donutChart);
    });

    function printReport() {
      window.print();
    }

    function rankClass(i) {
      return i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'rank-other';
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
      custSearch,
      custRiskFilter,
      custSortBy,
      custSubTab,
      visitFrequencyRows,
      filteredCustomers,
      expandedCustomer,
      toggleCustomer
    };
  },
template: `
  <div>
    <NavBar page="report"/>
    <div class="report-shell">
      <div class="report-layout">

        <!-- ── LEFT SIDEBAR ── -->
        <aside class="report-sidenav">
          <div class="sidenav-store-info">
            <div class="sidenav-store-name">{{store.name}}</div>
            <div class="sidenav-period" v-if="report">{{fmtDate(report.period.start)}} ~ {{fmtDate(report.period.end)}}</div>
          </div>
          <div class="sidenav-section-label">보고서 섹션</div>
          <template v-for="item in NAV_ITEMS" :key="item.id">
            <div v-if="item.divider" class="sidenav-divider"></div>
            <button
              :class="['sidenav-item', activeTab===item.id?'active':'', item.divider?'sidenav-item-highlight':'']"
              @click="activeTab=item.id">
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

        <!-- ── MAIN CONTENT ── -->
        <main class="report-content" v-if="!loading && report">

          <!-- Store Banner -->
          <div class="store-banner">
            <div class="sb-avatar">🏪</div>
            <div class="sb-info">
              <div class="sb-name">{{store.name}}</div>
              <div class="sb-meta">
                <span class="sb-chip sb-chip-active">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>
                  운영중
                </span>
                <span class="sb-chip">
                  <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {{store.address.split(',').slice(-2).join(',').trim()}}
                </span>
                <span class="sb-chip">
                  <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
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

          <!-- KPI Row -->
          <div class="kpi-row">
            <div class="kpi-tile kpi-brand">
              <div class="kpi-icon-wrap ic-brand">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              </div>
              <div class="kpi-lbl">종합 평점</div>
              <div class="kpi-val" style="color:var(--brand-600)">{{report.overallRating}}<span style="font-size:16px;color:var(--text-4);font-weight:500">/5.0</span></div>
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
              <div class="kpi-val" style="color:var(--accent-amber)">{{report.reviewCount.toLocaleString()}}<span style="font-size:15px;color:var(--text-4);font-weight:500">개</span></div>
              <div class="kpi-sub">리뷰 수</div>
            </div>
          </div>

          <!-- ── EXECUTIVE SUMMARY ── -->
          <div v-show="activeTab==='summary'" class="r-card">
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
                <div v-for="p in report.pillars" :key="p.type"
                  :class="['exec-pillar','ep-'+p.type]">
                  <div class="ep-label">{{p.label}}</div>
                  <div class="ep-val">{{p.val}}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── OVERALL RATING ── -->
          <div v-show="activeTab==='rating'" class="r-card">
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
              <div class="keyword-section">
                <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:8px">주요 키워드</div>
                <div class="keyword-cloud">
                  <span v-for="kw in report.keywords.positive" :key="kw.t" :class="['kw','kw-p','kw-'+kw.s]">{{kw.t}}</span>
                  <span v-for="kw in report.keywords.negative" :key="kw.t" :class="['kw','kw-n','kw-'+kw.s]">{{kw.t}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── SEGMENT ANALYSIS ── -->
          <div v-show="activeTab==='segment'" class="r-card">
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
                  <div class="seg-bar-track"><div class="seg-bar-fill-a" style="width:38%"></div></div>
                  <span style="font-size:13px;font-weight:700;color:var(--brand-600);width:36px;text-align:right">38%</span>
                </div>
                <div class="seg-bar-row">
                  <span class="seg-bar-lbl">재방문 고객</span>
                  <div class="seg-bar-track"><div class="seg-bar-fill-b" style="width:62%"></div></div>
                  <span style="font-size:13px;font-weight:700;color:var(--accent-emerald);width:36px;text-align:right">62%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── NPS ── -->
          <div v-show="activeTab==='nps'" class="r-card">
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
                    <div class="nps-band-track"><div class="nps-band-fill nps-pf-pro" :style="{width:report.nps.promoters+'%'}"></div></div>
                    <p class="nps-band-desc">추천 및 재방문 의사가 높은 충성 고객군</p>
                  </div>
                  <div class="nps-band nps-band-passive">
                    <div class="nps-band-hd">
                      <span class="nps-band-name">🟡 Passives (7–8)</span>
                      <span class="nps-band-pct">{{report.nps.passives}}%</span>
                    </div>
                    <div class="nps-band-track"><div class="nps-band-fill nps-pf-pas" :style="{width:report.nps.passives+'%'}"></div></div>
                    <p class="nps-band-desc">무난한 만족 수준, 이탈 가능성 잠재</p>
                  </div>
                  <div class="nps-band nps-band-detractor">
                    <div class="nps-band-hd">
                      <span class="nps-band-name">🔴 Detractors (0–6)</span>
                      <span class="nps-band-pct">{{report.nps.detractors}}%</span>
                    </div>
                    <div class="nps-band-track"><div class="nps-band-fill nps-pf-det" :style="{width:report.nps.detractors+'%'}"></div></div>
                    <p class="nps-band-desc">불만 고객, 이탈 위험 — 즉각 대응 필요</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TREND CHART ── -->
          <div v-show="activeTab==='trend'" class="r-card">
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
                  <span style="width:10px;height:10px;border-radius:50%;background:var(--brand-500);display:inline-block"></span> 평균 평점
                </span>
                <span style="display:flex;align-items:center;gap:5px">
                  <span style="width:10px;height:10px;border-radius:50%;background:#f43f5e;display:inline-block"></span> 급변 구간 (최저점)
                </span>
              </div>
            </div>
          </div>

          <!-- ── KEY DRIVERS ── -->
          <div v-show="activeTab==='drivers'" class="r-card">
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
              <p style="font-size:14px;color:var(--text-3);margin-bottom:18px;line-height:1.65">고객 만족도를 높이는 핵심 요인입니다. 전략적으로 강화해야 할 우선 영역입니다.</p>
              <div class="driver-list">
                <div v-for="(d,i) in report.drivers" :key="d.name" class="driver-row">
                  <div :class="['driver-rank', rankClass(i)]">{{i+1}}</div>
                  <div class="driver-emoji">{{d.emoji}}</div>
                  <div class="driver-mid">
                    <div class="driver-name">{{d.name}}</div>
                    <div class="driver-track"><div class="driver-fill" :style="{width:d.pct+'%'}"></div></div>
                  </div>
                  <div class="driver-pct-label">{{d.pct}}%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── IMPROVEMENTS ── -->
          <div v-show="activeTab==='improve'" class="r-card">
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
              <p style="font-size:14px;color:var(--text-3);margin-bottom:18px;line-height:1.65">고객 불만이 집중된 영역입니다. 즉각적인 개선 조치가 필요합니다.</p>
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

          <!-- ── AI INSIGHTS ── -->
          <div v-show="activeTab==='insights'" class="r-card">
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
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

          <!-- ── CUSTOMER ANALYSIS ── -->
          <div v-show="activeTab==='customers'">

            <!-- Sub-tab navigation -->
            <div class="ca-tab-bar">
              <button v-for="t in [
              {id:'overview',label:'Overview',icon:'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'},
              {id:'segments',label:'Segments',icon:'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'},
              {id:'funnel',label:'Funnel',icon:'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'},
              {id:'cohort',label:'Cohort',icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'},
              {id:'list',label:'고객 목록',icon:'M4 6h16M4 10h16M4 14h16M4 18h16'}
            ]"
                :key="t.id"
                :class="['ca-tab-btn', custSubTab===t.id?'ca-tab-active':'']"
                @click="custSubTab=t.id">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path :d="t.icon"/>
                </svg>
                {{t.label}}
              </button>
            </div>

            <!-- ─── OVERVIEW ─── -->
            <div v-show="custSubTab==='overview'">
              <div class="ca-kpi-row">
                <div class="ca-kpi-card">
                  <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                    <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div>
                    <div class="ca-kpi-label">총 고객 수</div>
                    <div class="ca-kpi-value" style="color:#6366f1">
                      {{ customers.summary.totalCustomers.current }}
                      <span class="ca-kpi-unit">명</span>
                    </div>
                    <div class="ca-kpi-trend" :class="customers.summary.totalCustomers.delta_pct >= 0 ? 'ca-trend-up' : 'ca-trend-down'">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path :d="customers.summary.totalCustomers.delta_pct >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
                      </svg>
                      {{ customers.summary.totalCustomers.delta_pct >= 0 ? '+' : '' }}{{ customers.summary.totalCustomers.delta_pct }}% 전월 대비
                    </div>
                  </div>
                </div>

                <div class="ca-kpi-card">
                  <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">
                    <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <div>
                    <div class="ca-kpi-label">이탈 위험 고객</div>
                    <div class="ca-kpi-value" style="color:#f43f5e">
                      {{ customers.summary.atRiskCustomers.current }}
                      <span class="ca-kpi-unit">명</span>
                    </div>
                    <div class="ca-kpi-trend" :class="customers.summary.atRiskCustomers.delta_pct <= 0 ? 'ca-trend-up' : 'ca-trend-down'">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path :d="customers.summary.atRiskCustomers.delta_pct <= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
                      </svg>
                      {{ customers.summary.atRiskCustomers.delta_pct > 0 ? '+' : '' }}{{ customers.summary.atRiskCustomers.delta_pct }}% 전월 대비
                    </div>
                  </div>
                </div>

                <div class="ca-kpi-card">
                  <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#10b981,#34d399)">
                    <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                  </div>
                  <div>
                    <div class="ca-kpi-label">평균 만족도</div>
                    <div class="ca-kpi-value" style="color:#10b981">
                      {{ Number(customers.summary.avgSatisfaction.current || 0).toFixed(1) }}
                      <span class="ca-kpi-unit">/5.0</span>
                    </div>
                    <div class="ca-kpi-trend" :class="customers.summary.avgSatisfaction.delta_value >= 0 ? 'ca-trend-up' : 'ca-trend-down'">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path :d="customers.summary.avgSatisfaction.delta_value >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
                      </svg>
                      {{ customers.summary.avgSatisfaction.delta_value >= 0 ? '+' : '' }}{{ customers.summary.avgSatisfaction.delta_value }} 전월 대비
                    </div>
                  </div>
                </div>

                <div class="ca-kpi-card">
                  <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">
                    <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </div>
                  <div>
                    <div class="ca-kpi-label">재방문율</div>
                    <div class="ca-kpi-value" style="color:#f59e0b">
                      {{ customers.summary.repeatVisitRate.current }}%
                    </div>
                    <div class="ca-kpi-trend" :class="customers.summary.repeatVisitRate.delta_pct >= 0 ? 'ca-trend-up' : 'ca-trend-down'">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path :d="customers.summary.repeatVisitRate.delta_pct >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
                      </svg>
                      {{ customers.summary.repeatVisitRate.delta_pct >= 0 ? '+' : '' }}{{ customers.summary.repeatVisitRate.delta_pct }}% 전월 대비
                    </div>
                  </div>
                </div>
              </div>

              <div class="ca-two-col">
                <div class="r-card" style="flex:1">
                  <div class="r-card-hd">
                    <div class="r-card-title">
                      <div class="r-title-icon ic-rose">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                      </div>
                      Risk Distribution
                    </div>
                  </div>
                  <div class="r-card-body">
                    <div class="ca-risk-bars">
                      <div class="ca-risk-row">
                        <div class="ca-risk-label-wrap">
                          <span class="ca-risk-dot" style="background:#f43f5e"></span>
                          <span class="ca-risk-lbl">HIGH Risk</span>
                        </div>
                        <div class="ca-risk-track">
                          <div class="ca-risk-fill" :style="{width:(customers.riskDistribution.high?.pct || 0)+'%',background:'linear-gradient(90deg,#f43f5e,#fb7185)'}"></div>
                        </div>
                        <span class="ca-risk-pct" style="color:#f43f5e">{{ customers.riskDistribution.high?.count || 0 }}명</span>
                      </div>

                      <div class="ca-risk-row">
                        <div class="ca-risk-label-wrap">
                          <span class="ca-risk-dot" style="background:#f59e0b"></span>
                          <span class="ca-risk-lbl">MEDIUM Risk</span>
                        </div>
                        <div class="ca-risk-track">
                          <div class="ca-risk-fill" :style="{width:(customers.riskDistribution.medium?.pct || 0)+'%',background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}"></div>
                        </div>
                        <span class="ca-risk-pct" style="color:#f59e0b">{{ customers.riskDistribution.medium?.count || 0 }}명</span>
                      </div>

                      <div class="ca-risk-row">
                        <div class="ca-risk-label-wrap">
                          <span class="ca-risk-dot" style="background:#10b981"></span>
                          <span class="ca-risk-lbl">LOW Risk</span>
                        </div>
                        <div class="ca-risk-track">
                          <div class="ca-risk-fill" :style="{width:(customers.riskDistribution.low?.pct || 0)+'%',background:'linear-gradient(90deg,#10b981,#34d399)'}"></div>
                        </div>
                        <span class="ca-risk-pct" style="color:#10b981">{{ customers.riskDistribution.low?.count || 0 }}명</span>
                      </div>
                    </div>

                    <div class="ca-churn-insight">
                      <div class="ca-churn-icon">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      이탈 위험 고객 <strong>{{ customers.riskDistribution.high?.count || 0 }}명</strong>의 평균 이탈 확률은
                      <strong>{{ customers.riskDistribution.high?.avg_churn_pct || 0 }}%</strong>입니다. 즉각적인 리텐션 전략이 필요합니다.
                    </div>
                  </div>
                </div>

                <div class="r-card" style="flex:1">
                  <div class="r-card-hd">
                    <div class="r-card-title">
                      <div class="r-title-icon ic-brand">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      방문 빈도 분포
                    </div>
                  </div>
                  <div class="r-card-body">
                    <div class="ca-freq-chart">
                      <div v-for="freq in visitFrequencyRows" :key="freq.label" class="ca-freq-row">
                        <span class="ca-freq-label">{{freq.label}}</span>
                        <div class="ca-freq-track">
                          <div class="ca-freq-fill" :style="{width:freq.pct+'%',background:freq.color}"></div>
                        </div>
                        <span class="ca-freq-pct" :style="{color:freq.color}">{{freq.pct}}%</span>
                      </div>
                    </div>
                    <div class="ca-avg-spend">
                      <div class="ca-avg-spend-item">
                        <span class="ca-avg-spend-label">평균 객단가</span>
                        <span class="ca-avg-spend-val">₩42,000</span>
                      </div>
                      <div class="ca-avg-spend-item">
                        <span class="ca-avg-spend-label">재방문 의향</span>
                        <span class="ca-avg-spend-val" style="color:#10b981">
                          {{ customers.visitFrequencyDistribution.repeat_intent_rate || 0 }}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── SEGMENTS ─── -->
            <div v-show="custSubTab==='segments'" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-violet">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                  </div>
                  Customer Segments
                </div>
                <span class="chip chip-brand">AI 자동 분류</span>
              </div>
              <div class="r-card-body">
                <div class="ca-segment-grid">
                  <div class="ca-seg-card" style="--seg-color:#6366f1;--seg-bg:#eef2ff">
                    <div class="ca-seg-header">
                      <div class="ca-seg-icon" style="background:#eef2ff">
                        <svg width="16" height="16" fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div class="ca-seg-badge" style="background:#eef2ff;color:#4f46e5">충성 고객</div>
                    </div>
                    <div class="ca-seg-count">{{customers.segments.loyal?.count || 0}}<span>명</span></div>
                    <div class="ca-seg-desc">반복 방문 · 만족도 높음 · 유지 강화 대상</div>
                    <div class="ca-seg-metrics">
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#6366f1">{{ Number(customers.segments.loyal?.avg_rating || 0).toFixed(1) }}</span></div>
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 지출</span><span class="ca-seg-m-val" style="color:#6366f1">₩52K</span></div>
                    </div>
                    <div class="ca-seg-bar-wrap">
                      <div class="ca-seg-bar" :style="{width:(customers.segments.loyal?.share_pct || 0)+'%',background:'#6366f1'}"></div>
                    </div>
                    <div class="ca-seg-pct">{{customers.segments.loyal?.share_pct || 0}}% of total</div>
                  </div>

                  <div class="ca-seg-card" style="--seg-color:#10b981;--seg-bg:#ecfdf5">
                    <div class="ca-seg-header">
                      <div class="ca-seg-icon" style="background:#ecfdf5">
                        <svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                      </div>
                      <div class="ca-seg-badge" style="background:#ecfdf5;color:#059669">신규 고객</div>
                    </div>
                    <div class="ca-seg-count">{{customers.segments.new?.count || 0}}<span>명</span></div>
                    <div class="ca-seg-desc">첫 방문 · 전환 가능성 높은 그룹</div>
                    <div class="ca-seg-metrics">
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#10b981">{{ Number(customers.segments.new?.avg_rating || 0).toFixed(1) }}</span></div>
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">전환률</span><span class="ca-seg-m-val" style="color:#10b981">{{ customers.segments.new?.conversion_rate || 0 }}%</span></div>
                    </div>
                    <div class="ca-seg-bar-wrap">
                      <div class="ca-seg-bar" :style="{width:(customers.segments.new?.share_pct || 0)+'%',background:'#10b981'}"></div>
                    </div>
                    <div class="ca-seg-pct">{{customers.segments.new?.share_pct || 0}}% of total</div>
                  </div>

                  <div class="ca-seg-card" style="--seg-color:#f43f5e;--seg-bg:#fff1f2">
                    <div class="ca-seg-header">
                      <div class="ca-seg-icon" style="background:#fff1f2">
                        <svg width="16" height="16" fill="none" stroke="#f43f5e" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      </div>
                      <div class="ca-seg-badge" style="background:#fff1f2;color:#e11d48">이탈 위험</div>
                    </div>
                    <div class="ca-seg-count">{{customers.segments.at_risk?.count || 0}}<span>명</span></div>
                    <div class="ca-seg-desc">별점 저하 · 최근 방문 감소 · 즉시 대응 필요</div>
                    <div class="ca-seg-metrics">
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#f43f5e">{{ Number(customers.segments.at_risk?.avg_rating || 0).toFixed(1) }}</span></div>
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">이탈 확률</span><span class="ca-seg-m-val" style="color:#f43f5e">{{ customers.segments.at_risk?.churn_probability || 0 }}%</span></div>
                    </div>
                    <div class="ca-seg-bar-wrap">
                      <div class="ca-seg-bar" :style="{width:(customers.segments.at_risk?.share_pct || 0)+'%',background:'#f43f5e'}"></div>
                    </div>
                    <div class="ca-seg-pct">{{customers.segments.at_risk?.share_pct || 0}}% of total</div>
                  </div>

                  <div class="ca-seg-card" style="--seg-color:#f59e0b;--seg-bg:#fffbeb">
                    <div class="ca-seg-header">
                      <div class="ca-seg-icon" style="background:#fffbeb">
                        <svg width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      </div>
                      <div class="ca-seg-badge" style="background:#fffbeb;color:#d97706">재활성화 필요</div>
                    </div>
                    <div class="ca-seg-count">{{customers.segments.reactivation?.count || 0}}<span>명</span></div>
                    <div class="ca-seg-desc">한동안 방문 없음 · 다시 유입시킬 대상</div>
                    <div class="ca-seg-metrics">
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#f59e0b">{{ Number(customers.segments.reactivation?.avg_rating || 0).toFixed(1) }}</span></div>
                      <div class="ca-seg-metric"><span class="ca-seg-m-label">재활성 가능</span><span class="ca-seg-m-val" style="color:#f59e0b">{{ customers.segments.reactivation?.reactivation_probability || 0 }}%</span></div>
                    </div>
                    <div class="ca-seg-bar-wrap">
                      <div class="ca-seg-bar" :style="{width:(customers.segments.reactivation?.share_pct || 0)+'%',background:'#f59e0b'}"></div>
                    </div>
                    <div class="ca-seg-pct">{{customers.segments.reactivation?.share_pct || 0}}% of total</div>
                  </div>
                </div>

                <div class="ca-seg-insights">
                  <div
                    v-for="(insight, idx) in (customers.segments.insights || [])"
                    :key="idx"
                    class="ca-insight-item"
                  >
                    <div class="ca-insight-dot" :style="{background: idx === 0 ? '#6366f1' : '#f43f5e'}"></div>
                    <div>{{ insight }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── COHORT ─── -->
            <div v-show="custSubTab==='cohort'" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-emerald">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  </div>
                  Cohort Retention Analysis
                </div>
                <span class="chip chip-neutral">월별 코호트</span>
              </div>
              <div class="r-card-body">
                <div class="ca-cohort-intro">
                  코호트 분석은 각 월에 처음 방문한 고객 그룹이 이후 월에 얼마나 재방문하는지를 추적합니다.
                </div>
                <div class="ca-cohort-table-wrap">
                  <table class="ca-cohort-table">
                    <thead>
                      <tr>
                        <th class="ca-cohort-th-first">코호트</th>
                        <th>규모</th>
                        <th>M+1</th>
                        <th>M+2</th>
                        <th>M+3</th>
                        <th>M+4</th>
                        <th>M+5</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in (customers.cohort.rows || [])" :key="row.cohort">
                        <td class="ca-cohort-td-first">{{row.cohort}}</td>
                        <td class="ca-cohort-td-size">{{row.size}}</td>
                        <td v-for="key in ['m1','m2','m3','m4','m5']" :key="key" class="ca-cohort-cell">
                          <div
                            v-if="row[key] !== null && row[key] !== undefined"
                            class="ca-cohort-pill"
                            :style="{
                              background: row[key] === 100
                                ? '#6366f1'
                                : row[key] >= 50
                                  ? 'rgba(99,102,241,' + (row[key] / 100 + 0.1) + ')'
                                  : 'rgba(99,102,241,' + (row[key] / 100 + 0.05) + ')',
                              color: row[key] >= 40 ? '#fff' : '#4338ca'
                            }"
                          >
                            {{row[key]}}%
                          </div>
                          <span v-else class="ca-cohort-empty">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="ca-cohort-legend">
                  <div class="ca-cohort-legend-item">
                    <div style="width:12px;height:12px;border-radius:3px;background:#6366f1"></div>
                    <span>100% (기준)</span>
                  </div>
                  <div class="ca-cohort-legend-item">
                    <div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,0.5)"></div>
                    <span>50%+</span>
                  </div>
                  <div class="ca-cohort-legend-item">
                    <div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,0.2)"></div>
                    <span>50% 미만</span>
                  </div>
                </div>
                <div class="ca-cohort-insight">
                  <svg width="13" height="13" fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  <div>{{ customers.cohort.summary_text || '코호트 요약이 없습니다.' }}</div>
                </div>
              </div>
            </div>

            <!-- ─── CUSTOMER LIST ─── -->
            <div v-show="custSubTab==='list'" class="r-card">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-brand">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                  </div>
                  고객 목록
                </div>
                <span class="chip chip-brand">{{filteredCustomers.length}}명</span>
              </div>
              <div class="r-card-body">
                <div class="ca-list-toolbar">
                  <div class="ca-list-search">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input v-model="custSearch" placeholder="고객명 검색..."/>
                  </div>
                  <div class="ca-list-filters">
                    <button v-for="f in [{id:'ALL',label:'전체'},{id:'HIGH',label:'🔴 HIGH'},{id:'MEDIUM',label:'🟡 MEDIUM'},{id:'LOW',label:'🟢 LOW'}]"
                      :key="f.id"
                      :class="['ca-filter-btn',custRiskFilter===f.id?'ca-filter-active':'']"
                      @click="custRiskFilter=f.id">
                      {{f.label}}
                    </button>
                    <select v-model="custSortBy" class="ca-sort-select">
                      <option value="churnPct">이탈위험 순</option>
                      <option value="rating">평점 순</option>
                      <option value="lastActivity">최근 활동 순</option>
                    </select>
                  </div>
                </div>

                <div class="ca-table-wrap">
                  <table class="ca-table">
                    <thead>
                      <tr>
                        <th>고객명</th>
                        <th>리스크</th>
                        <th>평점</th>
                        <th>이탈확률</th>
                        <th>방문빈도</th>
                        <th>객단가</th>
                        <th>최근활동</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="cust in filteredCustomers" :key="cust.id">
                        <tr class="ca-table-row" @click="toggleCustomer(cust.id)">
                          <td>
                            <div class="ca-cust-name-cell">
                              <div class="ca-cust-avatar" :style="{background:cust.risk==='HIGH'?'#fff1f2':cust.risk==='MEDIUM'?'#fffbeb':'#ecfdf5',color:cust.risk==='HIGH'?'#f43f5e':cust.risk==='MEDIUM'?'#f59e0b':'#10b981'}">
                                {{cust.name.charAt(0)}}
                              </div>
                              <span class="ca-cust-name">{{cust.name}}</span>
                            </div>
                          </td>
                          <td>
                            <span :class="['ca-risk-badge',cust.risk==='HIGH'?'ca-risk-high':cust.risk==='MEDIUM'?'ca-risk-medium':'ca-risk-low']">
                              {{cust.risk}}
                            </span>
                          </td>
                          <td>
                            <div class="ca-rating-cell">
                              <span class="ca-star" :style="{color:cust.rating>=4?'#f59e0b':'#94a3b8'}">★</span>
                              <span>{{cust.rating}}</span>
                            </div>
                          </td>
                          <td>
                            <div class="ca-churn-cell">
                              <div class="ca-churn-bar">
                                <div class="ca-churn-fill" :style="{width:cust.churnPct+'%',background:cust.churnPct>=70?'#f43f5e':cust.churnPct>=40?'#f59e0b':'#10b981'}"></div>
                              </div>
                              <span :style="{color:cust.churnPct>=70?'#f43f5e':cust.churnPct>=40?'#f59e0b':'#10b981',fontWeight:'700',fontSize:'12px'}">{{cust.churnPct}}%</span>
                            </div>
                          </td>
                          <td><span class="ca-freq-chip">{{cust.visitFreq}}</span></td>
                          <td><span class="ca-spend">{{cust.avgSpend}}</span></td>
                          <td><span class="ca-date">{{cust.lastActivity}}</span></td>
                          <td>
                            <svg :style="{transform:expandedCustomer===cust.id?'rotate(180deg)':'',transition:'transform .2s'}" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                          </td>
                        </tr>
                        <tr v-if="expandedCustomer===cust.id" class="ca-expanded-row">
                          <td colspan="8">
                            <div class="ca-expanded-inner">
                              <div class="ca-expanded-tags">
                                <div class="ca-exp-label">키워드 태그</div>
                                <span v-for="tag in cust.tags" :key="tag"
                                  :class="['ca-exp-tag',cust.sentiment==='positive'?'ca-tag-pos':cust.sentiment==='negative'?'ca-tag-neg':'ca-tag-neu']">
                                  {{tag}}
                                </span>
                              </div>
                              <div class="ca-expanded-actions">
                                <div class="ca-exp-label">추천 액션</div>
                                <div v-if="cust.risk==='HIGH'" class="ca-exp-action ca-action-urgent">
                                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                  즉시 리텐션 연락 필요 · 불만 사항 직접 해결
                                </div>
                                <div v-else-if="cust.risk==='MEDIUM'" class="ca-exp-action ca-action-medium">
                                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                  재방문 유도 이벤트 안내 · 할인 쿠폰 발송
                                </div>
                                <div v-else class="ca-exp-action ca-action-low">
                                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  VIP 등급 부여 검토 · 정기 리뷰 요청
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>



          <!-- ─── FUNNEL ─── -->
<div v-show="custSubTab==='funnel'" class="r-card">
  <div class="r-card-hd">
    <div class="r-card-title">
      <div class="r-title-icon ic-sky">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
        </svg>
      </div>
      Customer Journey Funnel
    </div>
    <span class="chip chip-neutral">목 데이터 유지</span>
  </div>

  <div class="r-card-body">
    <div class="ca-funnel-wrap">
      <div
        v-for="(step, idx) in [
          {label:'검색/인지', sub:'Google 검색·지도 노출', count:1240, pct:100, color:'#6366f1', dropRate:null},
          {label:'프로필 조회', sub:'리뷰·사진 확인', count:682, pct:55, color:'#8b5cf6', dropRate:'45%'},
          {label:'방문 결정', sub:'예약·방향 검색', count:341, pct:27.5, color:'#0ea5e9', dropRate:'50%'},
          {label:'실제 방문', sub:'체크인·결제 완료', count:248, pct:20, color:'#10b981', dropRate:'27%'},
          {label:'리뷰 작성', sub:'경험 공유·평점 부여', count:89, pct:7.2, color:'#f59e0b', dropRate:'64%'}
        ]"
        :key="step.label"
        class="ca-funnel-step"
      >
        <div class="ca-funnel-bar-wrap">
          <div
            class="ca-funnel-bar"
            :style="{width:step.pct+'%',background:step.color,opacity:1-(idx*0.08)}"
          ></div>
        </div>

        <div class="ca-funnel-info">
          <div class="ca-funnel-meta">
            <span class="ca-funnel-label">{{step.label}}</span>
            <span class="ca-funnel-sub">{{step.sub}}</span>
          </div>

          <div class="ca-funnel-right">
            <span class="ca-funnel-count" :style="{color:step.color}">
              {{step.count.toLocaleString()}}
            </span>
            <span class="ca-funnel-pct">{{step.pct}}%</span>
            <span v-if="step.dropRate" class="ca-funnel-drop">▼ {{step.dropRate}} drop</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ca-funnel-insight">
      <div class="ca-fi-icon">
        <svg width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <strong>핵심 병목 구간:</strong>
        방문 결정 → 실제 방문 단계에서 27% Drop이 발생합니다.
        예약 편의성 개선 및 대기 시간 안내를 통해 전환율을 12~18%p 향상시킬 수 있습니다.
      </div>
    </div>
  </div>
</div>

          <!-- ── ACTION PLAN ── -->
          <div v-show="activeTab==='action'" class="r-card">
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
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:var(--r-full);background:#fffbeb;color:#d97706">Medium</span>
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
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {{act.deadline}}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>

        <!-- Error State -->
        <div v-if="!loading && error" class="report-content">
          <div class="loading-overlay">
            <p class="loader-text" style="color:#ef4444">{{ error }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="report-content">
          <div class="loading-overlay">
            <div class="loader"></div>
            <p class="loader-text">AI가 리뷰 데이터를 분석하고 있습니다...</p>
          </div>
        </div>

      </div>
    </div>
  </div>
`
});