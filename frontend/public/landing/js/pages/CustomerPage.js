const {
  defineComponent,
  ref,
  computed
} = Vue;

import { fmtDate } from '../utils/helpers.js';
import { NavBar } from '../components/NavBar.js';

export const CustomerPage = defineComponent({
  name: 'CustomerPage',
  components: { NavBar },

  props: {
    store: { type: Object, required: true },
    period: {
      type: Object,
      default: () => ({ from: '', to: '' }),
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
      default: '',
    },
  },

  setup(props) {
    const custSubTab = ref('overview');
    const custSearch = ref('');
    const custRiskFilter = ref('ALL');
    const custSortBy = ref('churnPct');
    const expandedCustomer = ref(null);

    function formatDeltaText(value, suffix = '%') {
      const n = Number(value ?? 0);
      const abs = Math.abs(n);
      const formatted = abs.toFixed(1);

      if (n >= 0) return `+${formatted}${suffix} 전월 대비`;
      return `-${formatted}${suffix} 전월 대비`;
    }

    function formatDeltaValueText(value, digits = 1, suffix = '') {
      const n = Number(value ?? 0);
      const abs = Math.abs(n);
      const formatted = abs.toFixed(digits);

      if (n > 0) return `+${formatted}${suffix} 전월 대비`;
      if (n < 0) return `-${formatted}${suffix} 전월 대비`;
      return `+0.0${suffix} 전월 대비`;
    }

    function deltaTrendClass(value, invert = false) {
      const n = Number(value ?? 0);
      if (n === 0) return 'ca-trend-up';
      if (!invert) return n > 0 ? 'ca-trend-up' : 'ca-trend-down';
      return n < 0 ? 'ca-trend-up' : 'ca-trend-down';
    }

    function deltaArrowPath(value, invert = false) {
      const n = Number(value ?? 0);
      if (n === 0) return 'M5 15l7-7 7 7';
      if (!invert) return n > 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7';
      return n < 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7';
    }

    const visitFrequencyRows = computed(() => {
      const dist = props.customers?.visitFrequencyDistribution || {};

      return [
        { label: '주 1회+', pct: Number(dist.weekly_plus ?? 0), color: '#6366f1' },
        { label: '월 2회', pct: Number(dist.monthly_2 ?? 0), color: '#8b5cf6' },
        { label: '월 1회', pct: Number(dist.monthly_1 ?? 0), color: '#06b6d4' },
        { label: '가끔', pct: Number(dist.occasional ?? 0), color: '#f59e0b' },
        { label: '첫 방문', pct: Number(dist.first_visit ?? 0), color: '#f43f5e' },
      ];
    });

    const filteredCustomers = computed(() => {
      let list = props.customers?.list || [];

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
      <div v-if="loading">불러오는 중...</div>
      <div v-else-if="error">{{ error }}</div>

      <template v-else>
        <div class="ca-kpi-grid">
          <div class="ca-kpi-card">
            <div class="ca-kpi-label">총 고객 수</div>
            <div class="ca-kpi-value" style="color:#6366f1">
              {{ customers.summary.totalCustomers.current }}<span class="ca-kpi-unit">명</span>
            </div>
            <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.totalCustomers.delta_pct)">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path :d="deltaArrowPath(customers.summary.totalCustomers.delta_pct)" />
              </svg>
              {{ formatDeltaText(customers.summary.totalCustomers.delta_pct) }}
            </div>
          </div>

          <div class="ca-kpi-card">
            <div class="ca-kpi-label">이탈 위험 고객</div>
            <div class="ca-kpi-value" style="color:#ef4444">
              {{ customers.summary.atRiskCustomers.current }}<span class="ca-kpi-unit">명</span>
            </div>
            <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.atRiskCustomers.delta_pct, true)">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path :d="deltaArrowPath(customers.summary.atRiskCustomers.delta_pct, true)" />
              </svg>
              {{ formatDeltaText(customers.summary.atRiskCustomers.delta_pct) }}
            </div>
          </div>

          <div class="ca-kpi-card">
            <div class="ca-kpi-label">평균 만족도</div>
            <div class="ca-kpi-value" style="color:#10b981">
              {{ customers.summary.avgSatisfaction.current.toFixed(1) }}<span class="ca-kpi-unit">점</span>
            </div>
            <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.avgSatisfaction.delta_value)">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path :d="deltaArrowPath(customers.summary.avgSatisfaction.delta_value)" />
              </svg>
              {{ formatDeltaValueText(customers.summary.avgSatisfaction.delta_value, 1) }}
            </div>
          </div>

          <div class="ca-kpi-card">
            <div class="ca-kpi-label">재방문율</div>
            <div class="ca-kpi-value" style="color:#f59e0b">
              {{ customers.summary.repeatVisitRate.current.toFixed(1) }}<span class="ca-kpi-unit">%</span>
            </div>
            <div class="ca-kpi-trend" :class="deltaTrendClass(customers.summary.repeatVisitRate.delta_pct)">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path :d="deltaArrowPath(customers.summary.repeatVisitRate.delta_pct)" />
              </svg>
              {{ formatDeltaText(customers.summary.repeatVisitRate.delta_pct) }}
            </div>
          </div>
        </div>

        <div class="ca-subtabs">
          <button :class="['ca-subtab', custSubTab==='overview'?'active':'']" @click="custSubTab='overview'">Overview</button>
          <button :class="['ca-subtab', custSubTab==='segments'?'active':'']" @click="custSubTab='segments'">Segments</button>
          <button :class="['ca-subtab', custSubTab==='cohort'?'active':'']" @click="custSubTab='cohort'">Cohort</button>
          <button :class="['ca-subtab', custSubTab==='list'?'active':'']" @click="custSubTab='list'">Customer List</button>
        </div>

        <section v-if="custSubTab==='overview'">
          <div class="ca-section-card">
            <h3>방문 빈도 분포</h3>
            <div v-for="row in visitFrequencyRows" :key="row.label" class="ca-bar-row">
              <div class="ca-bar-label">{{ row.label }}</div>
              <div class="ca-bar-track">
                <div class="ca-bar-fill" :style="{ width: row.pct + '%', background: row.color }"></div>
              </div>
              <div class="ca-bar-value">{{ row.pct }}%</div>
            </div>
          </div>
        </section>

        <section v-if="custSubTab==='segments'">
          <div class="ca-kpi-grid">
            <div class="ca-kpi-card">
              <div class="ca-kpi-label">Loyal</div>
              <div class="ca-kpi-value">{{ customers.segments.loyal.count }}명</div>
              <div>{{ customers.segments.loyal.share_pct }}%</div>
            </div>
            <div class="ca-kpi-card">
              <div class="ca-kpi-label">New</div>
              <div class="ca-kpi-value">{{ customers.segments.new.count }}명</div>
              <div>{{ customers.segments.new.share_pct }}%</div>
            </div>
            <div class="ca-kpi-card">
              <div class="ca-kpi-label">At Risk</div>
              <div class="ca-kpi-value">{{ customers.segments.at_risk.count }}명</div>
              <div>{{ customers.segments.at_risk.share_pct }}%</div>
            </div>
            <div class="ca-kpi-card">
              <div class="ca-kpi-label">Reactivation</div>
              <div class="ca-kpi-value">{{ customers.segments.reactivation.count }}명</div>
              <div>{{ customers.segments.reactivation.share_pct }}%</div>
            </div>
          </div>
        </section>

        <section v-if="custSubTab==='cohort'">
          <div class="ca-section-card">
            <h3>Cohort</h3>
            <p>{{ customers.cohort.summary_text || '코호트 요약 없음' }}</p>
          </div>
        </section>

        <section v-if="custSubTab==='list'">
          <div class="ca-toolbar">
            <input v-model="custSearch" class="input" placeholder="고객명 검색" />
            <select v-model="custRiskFilter" class="select">
              <option value="ALL">전체 위험도</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select v-model="custSortBy" class="select">
              <option value="churnPct">이탈위험도순</option>
              <option value="rating">평점순</option>
              <option value="lastActivity">최근활동순</option>
            </select>
          </div>

          <div v-for="c in filteredCustomers" :key="c.id" class="customer-row">
            <div class="customer-row-head" @click="toggleCustomer(c.id)">
              <div>
                <strong>{{ c.name }}</strong>
                <div>{{ c.visitFreq }} · {{ c.risk }}</div>
              </div>
              <div>{{ c.churnPct }}%</div>
            </div>

            <div v-if="expandedCustomer===c.id" class="customer-row-body">
              <div>평점: {{ c.rating }}</div>
              <div>리뷰 수: {{ c.reviews }}</div>
              <div>마지막 활동: {{ c.lastActivity }}</div>
              <div>
                <span v-for="tag in c.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  `
});