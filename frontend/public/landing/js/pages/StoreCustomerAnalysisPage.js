const { defineComponent, ref, computed } = Vue;

import { fmtDate } from "../utils/helpers.js";

export const CustomerPage = defineComponent({
  name: "CustomerPage",

  props: {
    store: { type: Object, required: true },
    period: {
      type: Object,
      default: () => ({ from: "", to: "" }),
    },
    customers: {
      type: Object,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: "",
    },
  },

  setup(props) {
    const custSubTab = ref("overview");
    const custSearch = ref("");
    const custRiskFilter = ref("ALL");
    const custSortBy = ref("churnPct");
    const expandedCustomer = ref(null);

    function formatDeltaText(value, suffix = "%") {
      const n = Number(value ?? 0);
      const abs = Math.abs(n).toFixed(1);
      return `${n >= 0 ? "+" : "-"}${abs}${suffix} 전월 대비`;
    }

    function formatDeltaValueText(value, digits = 1, suffix = "") {
      const n = Number(value ?? 0);
      const abs = Math.abs(n).toFixed(digits);
      return `${n >= 0 ? "+" : "-"}${abs}${suffix} 전월 대비`;
    }

    function deltaTrendClass(value, invert = false) {
      const n = Number(value ?? 0);
      if (n === 0) return "ca-trend-up";
      if (!invert) return n > 0 ? "ca-trend-up" : "ca-trend-down";
      return n < 0 ? "ca-trend-up" : "ca-trend-down";
    }

    function deltaArrowPath(value, invert = false) {
      const n = Number(value ?? 0);
      if (n === 0) return "M5 15l7-7 7 7";
      if (!invert) return n > 0 ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7";
      return n < 0 ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7";
    }

    const visitFrequencyRows = computed(() => {
      const dist = props.customers?.visitFrequencyDistribution || {};
      return [
        {
          label: "주 1회+",
          pct: Number(dist.weekly_plus ?? 0),
          color: "#6366f1",
        },
        { label: "월 2회", pct: Number(dist.monthly_2 ?? 0), color: "#8b5cf6" },
        { label: "월 1회", pct: Number(dist.monthly_1 ?? 0), color: "#06b6d4" },
        { label: "가끔", pct: Number(dist.occasional ?? 0), color: "#f59e0b" },
        {
          label: "첫 방문",
          pct: Number(dist.first_visit ?? 0),
          color: "#f43f5e",
        },
      ];
    });

    const filteredCustomers = computed(() => {
      let list = props.customers?.list || [];

      if (custSearch.value) {
        const q = custSearch.value.toLowerCase();
        list = list.filter((c) => (c.name || "").toLowerCase().includes(q));
      }

      if (custRiskFilter.value !== "ALL") {
        list = list.filter((c) => c.risk === custRiskFilter.value);
      }

      return [...list].sort((a, b) => {
        if (custSortBy.value === "churnPct")
          return Number(b.churnPct || 0) - Number(a.churnPct || 0);
        if (custSortBy.value === "rating")
          return Number(a.rating || 0) - Number(b.rating || 0);
        if (custSortBy.value === "lastActivity")
          return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
        return 0;
      });
    });

    function toggleCustomer(id) {
      expandedCustomer.value = expandedCustomer.value === id ? null : id;
    }

    return {
      custSubTab,
      custSearch,
      custRiskFilter,
      custSortBy,
      expandedCustomer,
      visitFrequencyRows,
      filteredCustomers,
      toggleCustomer,
      fmtDate,
      formatDeltaText,
      formatDeltaValueText,
      deltaTrendClass,
      deltaArrowPath,
    };
  },

  template: `
    <div>
      <div v-if="loading" class="r-card">
        <div class="r-card-body">불러오는 중...</div>
      </div>

      <div v-else-if="error" class="r-card">
        <div class="r-card-body">{{ error }}</div>
      </div>

      <template v-else>
        <div class="ca-tab-bar">
          <button v-for="t in [
            {id:'overview',label:'Overview',icon:'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'},
            {id:'segments',label:'Segments',icon:'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'},
            // {id:'funnel',label:'Funnel',icon:'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'},
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

        <div v-show="custSubTab==='overview'">
          <div class="ca-kpi-row">
            <div class="ca-kpi-card">
              <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div>
                <div class="ca-kpi-label">총 고객 수</div>
                <div class="ca-kpi-value" style="color:#6366f1">{{ customers.summary.totalCustomers.current }}<span class="ca-kpi-unit">명</span></div>
                <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.totalCustomers.delta_pct)">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path :d="deltaArrowPath(customers.summary.totalCustomers.delta_pct)" /></svg>
                  {{ formatDeltaText(customers.summary.totalCustomers.delta_pct) }}
                </div>
              </div>
            </div>

            <div class="ca-kpi-card">
              <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">
                <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div>
                <div class="ca-kpi-label">이탈 위험 고객</div>
                <div class="ca-kpi-value" style="color:#f43f5e">{{ customers.summary.atRiskCustomers.current }}<span class="ca-kpi-unit">명</span></div>
                <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.atRiskCustomers.delta_pct, true)">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path :d="deltaArrowPath(customers.summary.atRiskCustomers.delta_pct, true)" /></svg>
                  {{ formatDeltaText(customers.summary.atRiskCustomers.delta_pct) }}
                </div>
              </div>
            </div>

            <div class="ca-kpi-card">
              <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#10b981,#34d399)">
                <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
              </div>
              <div>
                <div class="ca-kpi-label">평균 만족도</div>
                <div class="ca-kpi-value" style="color:#10b981">{{ Number(customers.summary.avgSatisfaction.current || 0).toFixed(1) }}<span class="ca-kpi-unit">/5.0</span></div>
                              <div
                class="ca-kpi-trend"
                :class="deltaTrendClass(customers.summary.avgSatisfaction.delta_pct)"
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path :d="deltaArrowPath(customers.summary.avgSatisfaction.delta_pct)" />
                </svg>
                {{ formatDeltaText(customers.summary.avgSatisfaction.delta_pct) }}
              </div>
              </div>
            </div>

            <div class="ca-kpi-card">
              <div class="ca-kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">
                <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </div>
              <div>
                <div class="ca-kpi-label">재방문율</div>
                <div class="ca-kpi-value" style="color:#f59e0b">{{ customers.summary.repeatVisitRate.current }}%</div>
                <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.repeatVisitRate.delta_pct)">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path :d="deltaArrowPath(customers.summary.repeatVisitRate.delta_pct)" /></svg>
                  {{ formatDeltaText(customers.summary.repeatVisitRate.delta_pct) }}
                </div>
              </div>
            </div>
          </div>

          <div class="ca-two-col">
            <div class="r-card" style="flex:1">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-rose"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
                  Risk Distribution
                </div>
              </div>
              <div class="r-card-body">
                <div class="ca-risk-bars">
                  <div class="ca-risk-row">
                    <div class="ca-risk-label-wrap"><span class="ca-risk-dot" style="background:#f43f5e"></span><span class="ca-risk-lbl">HIGH Risk</span></div>
                    <div class="ca-risk-track"><div class="ca-risk-fill" :style="{width:(customers.riskDistribution.high?.pct || 0)+'%',background:'linear-gradient(90deg,#f43f5e,#fb7185)'}"></div></div>
                    <span class="ca-risk-pct" style="color:#f43f5e">{{ customers.riskDistribution.high?.count || 0 }}명</span>
                  </div>
                  <div class="ca-risk-row">
                    <div class="ca-risk-label-wrap"><span class="ca-risk-dot" style="background:#f59e0b"></span><span class="ca-risk-lbl">MEDIUM Risk</span></div>
                    <div class="ca-risk-track"><div class="ca-risk-fill" :style="{width:(customers.riskDistribution.medium?.pct || 0)+'%',background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}"></div></div>
                    <span class="ca-risk-pct" style="color:#f59e0b">{{ customers.riskDistribution.medium?.count || 0 }}명</span>
                  </div>
                  <div class="ca-risk-row">
                    <div class="ca-risk-label-wrap"><span class="ca-risk-dot" style="background:#10b981"></span><span class="ca-risk-lbl">LOW Risk</span></div>
                    <div class="ca-risk-track"><div class="ca-risk-fill" :style="{width:(customers.riskDistribution.low?.pct || 0)+'%',background:'linear-gradient(90deg,#10b981,#34d399)'}"></div></div>
                    <span class="ca-risk-pct" style="color:#10b981">{{ customers.riskDistribution.low?.count || 0 }}명</span>
                  </div>
                </div>
                <div class="ca-churn-insight">
                  <div class="ca-churn-icon">
                    <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </div>

                  <div class="ca-churn-text">
                    이번 달 이탈 위험 고객은
                    <strong>{{ customers.riskDistribution.high?.count || 0 }}</strong>명이고,
                    평균 이탈 확률은
                    <strong>{{ customers.riskDistribution.high?.avg_churn_pct || 0 }}%</strong>입니다.
                  </div>
                </div>
              </div>
            </div>

            <div class="r-card" style="flex:1">
              <div class="r-card-hd">
                <div class="r-card-title">
                  <div class="r-title-icon ic-brand"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                  방문 빈도 분포
                </div>
              </div>
              <div class="r-card-body">
                <div class="ca-freq-chart">
                  <div v-for="freq in visitFrequencyRows" :key="freq.label" class="ca-freq-row">
                    <span class="ca-freq-label">{{freq.label}}</span>
                    <div class="ca-freq-track"><div class="ca-freq-fill" :style="{width:freq.pct+'%',background:freq.color}"></div></div>
                    <span class="ca-freq-pct" :style="{color:freq.color}">{{freq.pct}}%</span>
                  </div>
                </div>
                <div class="ca-avg-spend">
                  <div class="ca-avg-spend-item"><span class="ca-avg-spend-label">재방문 의향</span><span class="ca-avg-spend-val" style="color:#10b981">{{ customers.visitFrequencyDistribution.repeat_intent_rate || 0 }}%</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="custSubTab==='segments'" class="r-card">
          <div class="r-card-hd">
            <div class="r-card-title">
              <div class="r-title-icon ic-violet"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg></div>
              Customer Segments
            </div>
            <span class="chip chip-brand">AI 자동 분류</span>
          </div>
          <div class="r-card-body">
            <div class="ca-segment-grid">
              <div class="ca-seg-card" style="--seg-color:#6366f1;--seg-bg:#eef2ff">
                <div class="ca-seg-header"><div class="ca-seg-icon" style="background:#eef2ff"><svg width="16" height="16" fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="ca-seg-badge" style="background:#eef2ff;color:#4f46e5">충성 고객</div></div>
                <div class="ca-seg-count">{{customers.segments.loyal?.count || 0}}<span>명</span></div>
                <div class="ca-seg-desc">반복 방문 · 만족도 높음 · 유지 강화 대상</div>
                <div class="ca-seg-metrics">
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#6366f1">{{ Number(customers.segments.loyal?.avg_rating || 0).toFixed(1) }}</span></div>
                </div>
                <div class="ca-seg-bar-wrap"><div class="ca-seg-bar" :style="{width:(customers.segments.loyal?.share_pct || 0)+'%',background:'#6366f1'}"></div></div>
                <div class="ca-seg-pct">{{customers.segments.loyal?.share_pct || 0}}% of total</div>
              </div>

              <div class="ca-seg-card" style="--seg-color:#10b981;--seg-bg:#ecfdf5">
                <div class="ca-seg-header"><div class="ca-seg-icon" style="background:#ecfdf5"><svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div><div class="ca-seg-badge" style="background:#ecfdf5;color:#059669">신규 고객</div></div>
                <div class="ca-seg-count">{{customers.segments.new?.count || 0}}<span>명</span></div>
                <div class="ca-seg-desc">첫 방문 · 전환 가능성 높은 그룹</div>
                <div class="ca-seg-metrics">
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#10b981">{{ Number(customers.segments.new?.avg_rating || 0).toFixed(1) }}</span></div>
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">전환률</span><span class="ca-seg-m-val" style="color:#10b981">{{ customers.segments.new?.conversion_rate || 0 }}%</span></div>
                </div>
                <div class="ca-seg-bar-wrap"><div class="ca-seg-bar" :style="{width:(customers.segments.new?.share_pct || 0)+'%',background:'#10b981'}"></div></div>
                <div class="ca-seg-pct">{{customers.segments.new?.share_pct || 0}}% of total</div>
              </div>

              <div class="ca-seg-card" style="--seg-color:#f43f5e;--seg-bg:#fff1f2">
                <div class="ca-seg-header"><div class="ca-seg-icon" style="background:#fff1f2"><svg width="16" height="16" fill="none" stroke="#f43f5e" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div class="ca-seg-badge" style="background:#fff1f2;color:#e11d48">이탈 위험</div></div>
                <div class="ca-seg-count">{{customers.segments.at_risk?.count || 0}}<span>명</span></div>
                <div class="ca-seg-desc">별점 저하 · 최근 방문 감소 · 즉시 대응 필요</div>
                <div class="ca-seg-metrics">
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#f43f5e">{{ Number(customers.segments.at_risk?.avg_rating || 0).toFixed(1) }}</span></div>
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">이탈 확률</span><span class="ca-seg-m-val" style="color:#f43f5e">{{ customers.segments.at_risk?.churn_probability || 0 }}%</span></div>
                </div>
                <div class="ca-seg-bar-wrap"><div class="ca-seg-bar" :style="{width:(customers.segments.at_risk?.share_pct || 0)+'%',background:'#f43f5e'}"></div></div>
                <div class="ca-seg-pct">{{customers.segments.at_risk?.share_pct || 0}}% of total</div>
              </div>

              <div class="ca-seg-card" style="--seg-color:#f59e0b;--seg-bg:#fffbeb">
                <div class="ca-seg-header"><div class="ca-seg-icon" style="background:#fffbeb"><svg width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></div><div class="ca-seg-badge" style="background:#fffbeb;color:#d97706">재활성화 필요</div></div>
                <div class="ca-seg-count">{{customers.segments.reactivation?.count || 0}}<span>명</span></div>
                <div class="ca-seg-desc">한동안 방문 없음 · 다시 유입시킬 대상</div>
                <div class="ca-seg-metrics">
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">평균 평점</span><span class="ca-seg-m-val" style="color:#f59e0b">{{ Number(customers.segments.reactivation?.avg_rating || 0).toFixed(1) }}</span></div>
                  <div class="ca-seg-metric"><span class="ca-seg-m-label">재활성 가능</span><span class="ca-seg-m-val" style="color:#f59e0b">{{ customers.segments.reactivation?.reactivation_probability || 0 }}%</span></div>
                </div>
                <div class="ca-seg-bar-wrap"><div class="ca-seg-bar" :style="{width:(customers.segments.reactivation?.share_pct || 0)+'%',background:'#f59e0b'}"></div></div>
                <div class="ca-seg-pct">{{customers.segments.reactivation?.share_pct || 0}}% of total</div>
              </div>
            </div>

            <div class="ca-seg-insights">
              <div v-for="(insight, idx) in (customers.segments.insights || [])" :key="idx" class="ca-insight-item">
                <div class="ca-insight-dot" :style="{background: idx === 0 ? '#6366f1' : '#f43f5e'}"></div>
                <div>{{ insight }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="custSubTab==='funnel'" class="r-card">
          <div class="r-card-hd">
            <div class="r-card-title">
              <div class="r-title-icon ic-sky"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg></div>
              Customer Journey Funnel
            </div>
            <span class="chip chip-neutral">목 데이터 유지</span>
          </div>
          <div class="r-card-body">
            <div class="ca-funnel-wrap">
              <div v-for="(step, idx) in [
                {label:'검색/인지', sub:'Google 검색·지도 노출', count:1240, pct:100, color:'#6366f1', dropRate:null},
                {label:'프로필 조회', sub:'리뷰·사진 확인', count:682, pct:55, color:'#8b5cf6', dropRate:'45%'},
                {label:'방문 결정', sub:'예약·방향 검색', count:341, pct:27.5, color:'#0ea5e9', dropRate:'50%'},
                {label:'실제 방문', sub:'체크인·결제 완료', count:248, pct:20, color:'#10b981', dropRate:'27%'},
                {label:'리뷰 작성', sub:'경험 공유·평점 부여', count:89, pct:7.2, color:'#f59e0b', dropRate:'64%'}
              ]" :key="step.label" class="ca-funnel-step">
                <div class="ca-funnel-bar-wrap"><div class="ca-funnel-bar" :style="{width:step.pct+'%',background:step.color,opacity:1-(idx*0.08)}"></div></div>
                <div class="ca-funnel-info">
                  <div class="ca-funnel-meta"><span class="ca-funnel-label">{{step.label}}</span><span class="ca-funnel-sub">{{step.sub}}</span></div>
                  <div class="ca-funnel-right"><span class="ca-funnel-count" :style="{color:step.color}">{{step.count.toLocaleString()}}</span><span class="ca-funnel-pct">{{step.pct}}%</span><span v-if="step.dropRate" class="ca-funnel-drop">▼ {{step.dropRate}} drop</span></div>
                </div>
              </div>
            </div>
            <div class="ca-funnel-insight">
              <div class="ca-fi-icon"><svg width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
              <div><strong>핵심 병목 구간:</strong> 방문 결정 → 실제 방문 단계에서 27% Drop이 발생합니다. 예약 편의성 개선 및 대기 시간 안내를 통해 전환율을 12~18%p 향상시킬 수 있습니다.</div>
            </div>
          </div>
        </div>

        <div v-show="custSubTab==='cohort'" class="r-card">
          <div class="r-card-hd">
            <div class="r-card-title">
              <div class="r-title-icon ic-emerald"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
              Cohort Retention Analysis
            </div>
            <span class="chip chip-neutral">월별 코호트</span>
          </div>
          <div class="r-card-body">
            <div class="ca-cohort-intro">코호트 분석은 각 월에 처음 방문한 고객 그룹이 이후 월에 얼마나 재방문하는지를 추적합니다.</div>
            <div class="ca-cohort-table-wrap">
              <table class="ca-cohort-table">
                <thead>
                  <tr><th class="ca-cohort-th-first">코호트</th><th>규모</th><th>M+1</th><th>M+2</th><th>M+3</th><th>M+4</th><th>M+5</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in (customers.cohort.rows || [])" :key="row.cohort">
                    <td class="ca-cohort-td-first">{{row.cohort}}</td>
                    <td class="ca-cohort-td-size">{{row.size}}</td>
                    <td v-for="key in ['m1','m2','m3','m4','m5']" :key="key" class="ca-cohort-cell">
                      <div v-if="row[key] !== null && row[key] !== undefined" class="ca-cohort-pill" :style="{background: row[key] === 100 ? '#6366f1' : row[key] >= 50 ? 'rgba(99,102,241,' + (row[key] / 100 + 0.1) + ')' : 'rgba(99,102,241,' + (row[key] / 100 + 0.05) + ')', color: row[key] >= 40 ? '#fff' : '#4338ca'}">{{row[key]}}%</div>
                      <span v-else class="ca-cohort-empty">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="ca-cohort-legend">
              <div class="ca-cohort-legend-item"><div style="width:12px;height:12px;border-radius:3px;background:#6366f1"></div><span>100% (기준)</span></div>
              <div class="ca-cohort-legend-item"><div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,0.5)"></div><span>50%+</span></div>
              <div class="ca-cohort-legend-item"><div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,0.2)"></div><span>낮은 유지율</span></div>
            </div>
            <div class="ca-cohort-insight"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg><div>{{ customers.cohort.summary_text || '코호트 요약이 없습니다.' }}</div></div>
          </div>
        </div>

        <div v-show="custSubTab==='list'" class="r-card">
          <div class="r-card-hd">
            <div class="r-card-title">
              <div class="r-title-icon ic-brand"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg></div>
              고객 목록
            </div>
            <span class="chip chip-brand">{{filteredCustomers.length}}명</span>
          </div>
          <div class="r-card-body">
            <div class="ca-list-toolbar">
              <div class="ca-list-search"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input v-model="custSearch" placeholder="고객명 검색..."/></div>
              <div class="ca-list-filters">
                <button v-for="f in [{id:'ALL',label:'전체'},{id:'HIGH',label:'🔴 HIGH'},{id:'MEDIUM',label:'🟡 MEDIUM'},{id:'LOW',label:'🟢 LOW'}]" :key="f.id" :class="['ca-filter-btn',custRiskFilter===f.id?'ca-filter-active':'']" @click="custRiskFilter=f.id">{{f.label}}</button>
                <select v-model="custSortBy" class="ca-sort-select"><option value="churnPct">이탈위험 순</option><option value="rating">평점 순</option><option value="lastActivity">최근 활동 순</option></select>
              </div>
            </div>

            <div class="ca-table-wrap">
              <table class="ca-table">
                 <colgroup>
                  <col style="width: 34%;">
                  <col style="width: 12%;">
                  <col style="width: 10%;">
                  <col style="width: 16%;">
                  <col style="width: 14%;">
                  <col style="width: 12%;">
                  <col style="width: 2%;">
                </colgroup>
                <thead>
                  <tr><th>고객명</th><th>리스크</th><th>평점</th><th>이탈확률</th><th>방문빈도</th><th>최근활동</th><th></th></tr>
                </thead>
                <tbody>
                  <template v-for="cust in filteredCustomers" :key="cust.id">
                    <tr class="ca-table-row" @click="toggleCustomer(cust.id)">
                      <td>
                        <div class="ca-cust-name-cell">
                          <div class="ca-cust-avatar" :style="{background:cust.risk==='HIGH'?'#fff1f2':cust.risk==='MEDIUM'?'#fffbeb':'#ecfdf5',color:cust.risk==='HIGH'?'#f43f5e':cust.risk==='MEDIUM'?'#f59e0b':'#10b981'}">{{cust.name.charAt(0)}}</div>
                          <span class="ca-cust-name">{{cust.name}}</span>
                        </div>
                      </td>
                      <td><span :class="['ca-risk-badge',cust.risk==='HIGH'?'ca-risk-high':cust.risk==='MEDIUM'?'ca-risk-medium':'ca-risk-low']">{{cust.risk}}</span></td>
                      <td><div class="ca-rating-cell"><span class="ca-star" :style="{color:cust.rating>=4?'#f59e0b':'#94a3b8'}">★</span><span>{{cust.rating}}</span></div></td>
                      <td><div class="ca-churn-cell"><div class="ca-churn-bar"><div class="ca-churn-fill" :style="{width:cust.churnPct+'%',background:cust.churnPct>=70?'#f43f5e':cust.churnPct>=40?'#f59e0b':'#10b981'}"></div></div><span :style="{color:cust.churnPct>=70?'#f43f5e':cust.churnPct>=40?'#f59e0b':'#10b981',fontWeight:'700',fontSize:'12px'}">{{cust.churnPct}}%</span></div></td>
                      <td><span class="ca-freq-chip">{{cust.visitFreq}}</span></td>
                      <td><span class="ca-date">{{cust.lastActivity}}</span></td>
                      <td><svg :style="{transform:expandedCustomer===cust.id?'rotate(180deg)':'',transition:'transform .2s'}" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></td>
                    </tr>
                    <tr v-if="expandedCustomer===cust.id" class="ca-expanded-row">
                      <td colspan="7">
                        <div class="ca-expanded-inner">
                          <div class="ca-expanded-tags">
                            <div class="ca-exp-label">키워드 태그</div>
                            <span v-for="tag in cust.tags" :key="tag" :class="['ca-exp-tag',cust.sentiment==='positive'?'ca-tag-pos':cust.sentiment==='negative'?'ca-tag-neg':'ca-tag-neu']">{{tag}}</span>
                          </div>
                          <div class="ca-expanded-actions">
                            <div class="ca-exp-label">추천 액션</div>
                            <div v-if="cust.risk==='HIGH'" class="ca-exp-action ca-action-urgent"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>즉시 리텐션 연락 필요 · 불만 사항 직접 해결</div>
                            <div v-else-if="cust.risk==='MEDIUM'" class="ca-exp-action ca-action-medium"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>재방문 유도 이벤트 안내 · 할인 쿠폰 발송</div>
                            <div v-else class="ca-exp-action ca-action-low"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>VIP 등급 부여 검토 · 정기 리뷰 요청</div>
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
      </template>
    </div>
  `,
});
