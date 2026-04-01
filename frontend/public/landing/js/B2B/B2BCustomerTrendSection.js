const { defineComponent, ref, computed, nextTick, watch, onMounted, onUnmounted } = Vue;

import { DB_STORE, destroyChart } from './shared.js';
import { B2B_CUSTOMER_TREND_MOCK } from './B2BCustomerTrendMock.js';

export const B2BCustomerTrendSection = defineComponent({
  name: 'B2BCustomerTrendSection',

  props: {
    compId: { type: String, required: true },
    analysisPeriod: { type: Object, required: true },
  },

  setup(props) {
    const kwChartMode = ref('rank');
    const prospectFilter = ref('');

    let kwDailyChartInst = null;
    let kwMonthlyChartInst = null;

    const mockBlock = computed(
      () =>
        B2B_CUSTOMER_TREND_MOCK[props.compId] || {
          signalKeywords: [],
          prospects: [],
        }
    );

    const dbSignalKeywords = computed(() => DB_STORE.getSignalKeywords(props.compId));
    const dbProspects = computed(() => DB_STORE.getProspects(props.compId));

    const signalKeywordsSource = computed(() => {
      const rows = dbSignalKeywords.value || [];
      return rows.length ? rows : mockBlock.value.signalKeywords;
    });

    const prospectsSource = computed(() => {
      const rows = dbProspects.value || [];
      return rows.length ? rows : mockBlock.value.prospects;
    });

    const externalTopKpis = computed(() => {
      const signalKeywords = signalKeywordsSource.value;
      const prospects = prospectsSource.value;

      return {
        totalHits: signalKeywords.reduce((s, k) => s + Number(k.hit_count || 0), 0),
        activeKeywordCount: signalKeywords.filter((k) => k.active !== false).length,
        prospectCount: prospects.length,
        highCount: prospects.filter((p) => p.opportunity_grade === 'high').length,
      };
    });

    const externalKeywordRows = computed(() =>
      [...signalKeywordsSource.value]
        .filter((k) => k.active !== false)
        .sort((a, b) => Number(b.hit_count || 0) - Number(a.hit_count || 0))
        .map((row) => ({
          _id: row._id,
          keyword: row.keyword,
          kw_type: row.kw_type || '이벤트',
          signal_level: row.signal_level || 'medium',
          hit_count: Number(row.hit_count || 0),
          last_hit: row.last_hit || props.analysisPeriod.end,
          active: row.active,
        }))
    );

    const filteredProspects = computed(() => {
      const base = prospectsSource.value;
      if (!prospectFilter.value) return base;
      return base.filter((x) => x.opportunity_grade === prospectFilter.value);
    });

    function makeLineChart(canvasId, labels, datasets) {
      const el = document.getElementById(canvasId);
      if (!el) return null;

      return new Chart(el, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { boxWidth: 10, font: { size: 11 } },
            },
          },
          elements: {
            line: { tension: 0.4, borderWidth: 2.5 },
            point: { radius: 3 },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { size: 10 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 },
            },
          },
        },
      });
    }

    function makeBarChart(canvasId, labels, datasets) {
      const el = document.getElementById(canvasId);
      if (!el) return null;

      return new Chart(el, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { boxWidth: 10, font: { size: 11 } },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 } },
            },
          },
        },
      });
    }

    async function buildKwDailyChart() {
      await nextTick();
      const rows = externalKeywordRows.value.slice(0, 5);
      destroyChart(kwDailyChartInst);

      const labels = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }

      const COLORS = ['#f43f5e', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6'];

      const datasets = rows.map((kw, idx) => {
        const total = kw.hit_count || 0;
        const data = labels.map((_, i) => {
          const w = Math.pow(1.15, i);
          return Math.round(total * w / labels.reduce((s, _, j) => s + Math.pow(1.15, j), 0));
        });

        return {
          label: kw.keyword,
          data,
          borderColor: COLORS[idx % COLORS.length],
          backgroundColor: COLORS[idx % COLORS.length] + '15',
          fill: false,
          pointBackgroundColor: COLORS[idx % COLORS.length],
        };
      });

      kwDailyChartInst = makeLineChart('kwDailyChart', labels, datasets);
    }

    async function buildKwMonthlyChart() {
      await nextTick();
      destroyChart(kwMonthlyChartInst);

      const rows = externalKeywordRows.value;
      const highTotal = rows.filter((k) => k.signal_level === 'high').reduce((s, k) => s + (k.hit_count || 0), 0);
      const medTotal = rows.filter((k) => k.signal_level === 'medium').reduce((s, k) => s + (k.hit_count || 0), 0);
      const lowTotal = rows.filter((k) => k.signal_level === 'low').reduce((s, k) => s + (k.hit_count || 0), 0);

      const labels = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        labels.push(`${d.getMonth() + 1}월`);
      }

      const growFactor = (total, idx) =>
        Math.max(0, Math.round(total * (0.45 + (idx / 5) * 0.75) / 3 + Math.random() * 1.5));

      kwMonthlyChartInst = makeBarChart('kwMonthlyChart', labels, [
        {
          label: 'HIGH',
          data: labels.map((_, i) => growFactor(highTotal, i)),
          backgroundColor: 'rgba(244,63,94,.8)',
          borderRadius: 5,
        },
        {
          label: 'MED',
          data: labels.map((_, i) => growFactor(medTotal, i)),
          backgroundColor: 'rgba(245,158,11,.7)',
          borderRadius: 5,
        },
        {
          label: 'LOW',
          data: labels.map((_, i) => growFactor(lowTotal, i)),
          backgroundColor: 'rgba(148,163,184,.5)',
          borderRadius: 5,
        },
      ]);
    }

    watch(kwChartMode, async (mode) => {
      if (mode === 'daily') await buildKwDailyChart();
      if (mode === 'monthly') await buildKwMonthlyChart();
    });

    onMounted(async () => {
      await DB_STORE.loadAll();
      await nextTick();

      if (kwChartMode.value === 'daily') await buildKwDailyChart();
      if (kwChartMode.value === 'monthly') await buildKwMonthlyChart();
    });

    onUnmounted(() => {
      destroyChart(kwDailyChartInst);
      destroyChart(kwMonthlyChartInst);
    });

    async function updateProspectSalesStatus(prospect, newStatus) {
      try {
        if (!prospect._id || !DB_STORE.updateProspect) return;

        await DB_STORE.updateProspect(prospect._id, {
          ...prospect,
          comp_id: prospect.comp_id || props.compId,
          sales_status: newStatus,
        });
      } catch (e) {
        console.error(e);
      }
    }

    return {
      kwChartMode,
      prospectFilter,
      dbSignalKeywords,
      dbProspects,
      signalKeywordsSource,
      prospectsSource,
      externalTopKpis,
      externalKeywordRows,
      filteredProspects,
      updateProspectSalesStatus,
    };
  },

  template: `
  <div>
    <div class="b2b-top-kpi b2b-top-kpi-external">
      <div class="b2b-tkpi b2b-tkpi-wide">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#8b5cf6,#a78bfa)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">누적 시그널 히트</div>
          <div class="b2b-tkpi-val" style="color:#8b5cf6">
            {{ externalTopKpis.totalHits }}<span class="b2b-tkpi-unit">건</span>
          </div>
          <div class="b2b-tkpi-trend">{{ externalTopKpis.activeKeywordCount }}개 키워드 모니터링 중</div>
        </div>
      </div>

      <div class="b2b-tkpi b2b-tkpi-wide">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#10b981,#34d399)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">신규 영업기회 후보</div>
          <div class="b2b-tkpi-val" style="color:#10b981">
            {{ externalTopKpis.prospectCount }}<span class="b2b-tkpi-unit">건</span>
          </div>
          <div class="b2b-tkpi-trend">탐지된 신규 고객 후보</div>
        </div>
      </div>

      <div class="b2b-tkpi b2b-tkpi-wide b2b-tkpi-high-alert">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">HIGH 기회 고객</div>
          <div class="b2b-tkpi-val" style="color:#f43f5e">
            {{ externalTopKpis.highCount }}<span class="b2b-tkpi-unit">건</span>
          </div>
          <div class="b2b-tkpi-trend" style="color:#f43f5e;font-weight:700">즉시 영업 접촉 권장</div>
        </div>
      </div>
    </div>

    <div class="r-card" style="margin-bottom:20px">
      <div class="r-card-hd">
        <div class="r-card-title">
          <div class="r-title-icon ic-amber">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7A2 2 0 012 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          시그널 키워드 히트 현황
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <span class="chip chip-neutral">{{ externalTopKpis.activeKeywordCount }}개 모니터링</span>

          <div class="cdt-chart-toggle">
            <button :class="['cdt-toggle-btn', kwChartMode==='rank' ? 'active' : '']" @click="kwChartMode='rank'">순위</button>
            <button :class="['cdt-toggle-btn', kwChartMode==='daily' ? 'active' : '']" @click="kwChartMode='daily'">일별 추이</button>
            <button :class="['cdt-toggle-btn', kwChartMode==='monthly' ? 'active' : '']" @click="kwChartMode='monthly'">월별 추이</button>
          </div>
        </div>
      </div>

      <div class="r-card-body" style="padding:0">
        <template v-if="kwChartMode==='rank'">
          <div v-if="!signalKeywordsSource.length" style="padding:20px;text-align:center;color:var(--text-4);font-size:13px">
            Admin에서 시그널 키워드를 등록하세요
          </div>

          <table v-else class="cdt-kw-table">
            <thead>
              <tr>
                <th style="width:28px">#</th>
                <th>키워드</th>
                <th>유형</th>
                <th>강도</th>
                <th>히트수</th>
                <th>최근 탐지</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(kw, idx) in externalKeywordRows.slice(0, 10)"
                :key="kw._id || kw.keyword || idx"
                :class="['cdt-kw-row', kw.active === false ? 'cdt-kw-inactive' : '']"
              >
                <td style="text-align:center;font-size:11px;font-weight:800;color:var(--text-4)">{{ idx + 1 }}</td>

                <td>
                  <span class="cdt-kw-chip" :class="'cdt-kw-' + kw.signal_level">{{ kw.keyword }}</span>
                </td>

                <td>
                  <span class="cdt-type-tag">{{ kw.kw_type || '이벤트' }}</span>
                </td>

                <td>
                  <span class="cdt-signal-dot" :class="'cdt-sig-' + kw.signal_level"></span>
                  <span :style="{ fontSize:'11px', fontWeight:'700', color: kw.signal_level==='high' ? '#f43f5e' : kw.signal_level==='medium' ? '#f59e0b' : '#94a3b8' }">
                    {{ kw.signal_level==='high' ? 'HIGH' : kw.signal_level==='medium' ? 'MED' : 'LOW' }}
                  </span>
                </td>

                <td style="text-align:center">
                  <span class="cdt-hit-badge">{{ kw.hit_count || 0 }}</span>
                </td>

                <td style="font-size:11px;color:var(--text-4)">{{ kw.last_hit || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else-if="kwChartMode==='daily'">
          <div class="cdt-trend-wrap">
            <div class="cdt-trend-info">
              <div class="cdt-trend-desc">최근 14일 키워드 누적 히트 추이</div>
              <div class="cdt-trend-legend">
                <span
                  v-for="kw in externalKeywordRows.slice(0, 5)"
                  :key="kw.keyword"
                  class="cdt-legend-item"
                >
                  <span class="cdt-legend-dot" :style="{ background: kw.signal_level==='high' ? '#f43f5e' : kw.signal_level==='medium' ? '#f59e0b' : '#94a3b8' }"></span>
                  {{ kw.keyword }}
                </span>
              </div>
            </div>

            <div class="cdt-trend-chart-area">
              <canvas id="kwDailyChart" height="180"></canvas>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="cdt-trend-wrap">
            <div class="cdt-trend-info">
              <div class="cdt-trend-desc">최근 6개월 시그널 레벨별 히트 건수</div>
              <div class="cdt-trend-legend">
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#f43f5e"></span>HIGH 시그널</span>
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#f59e0b"></span>MED 시그널</span>
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#94a3b8"></span>LOW 시그널</span>
              </div>
            </div>

            <div class="cdt-trend-chart-area">
              <canvas id="kwMonthlyChart" height="180"></canvas>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="r-card">
      <div class="r-card-hd">
        <div class="r-card-title">
          <div class="r-title-icon ic-emerald">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          신규 영업기회 — 고객 후보 탐지

          <span
            v-if="filteredProspects.length"
            style="margin-left:8px;font-size:11px;font-weight:600;padding:2px 8px;background:#fff1f2;color:#f43f5e;border-radius:999px;border:1px solid #fda4af"
          >
            HIGH {{ filteredProspects.filter(p => p.opportunity_grade === 'high').length }}건 즉시 접촉 필요
          </span>
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <div class="cdt-chart-toggle">
            <button :class="['cdt-toggle-btn', prospectFilter==='' ? 'active' : '']" @click="prospectFilter=''">
              전체 {{ prospectsSource.length }}
            </button>
            <button :class="['cdt-toggle-btn cdt-toggle-high', prospectFilter==='high' ? 'active' : '']" @click="prospectFilter = prospectFilter === 'high' ? '' : 'high'">
              HIGH {{ prospectsSource.filter(p => p.opportunity_grade === 'high').length }}
            </button>
            <button :class="['cdt-toggle-btn cdt-toggle-med', prospectFilter==='medium' ? 'active' : '']" @click="prospectFilter = prospectFilter === 'medium' ? '' : 'medium'">
              MED {{ prospectsSource.filter(p => p.opportunity_grade === 'medium').length }}
            </button>
          </div>
        </div>
      </div>

      <div class="r-card-body" style="padding:16px">
        <div v-if="!filteredProspects.length" style="padding:24px;text-align:center;color:var(--text-4);font-size:13px">
          시그널 키워드 설정 후 자동 탐지됩니다
        </div>

        <div v-else class="cdt-prospect-grid">
          <div
            v-for="p in [...filteredProspects].sort((a,b)=>{ const g={ high:0, medium:1, low:2 }; return (g[a.opportunity_grade] ?? 1) - (g[b.opportunity_grade] ?? 1); })"
            :key="p._id || p.prospect_name"
            class="cdt-pcard"
            :class="'cdt-pcard-' + (p.opportunity_grade || 'medium')"
          >
            <div class="cdt-pcard-hd">
              <span class="cdt-opp-grade" :class="'cdt-opp-grade-' + (p.opportunity_grade || 'medium')">
                {{ p.opportunity_grade === 'high' ? 'HIGH' : p.opportunity_grade === 'medium' ? 'MED' : 'LOW' }}
              </span>

              <div class="cdt-status-cycle" title="클릭하여 영업 상태 변경">
                <span
                  class="cdt-status-chip"
                  :class="'cdt-st-' + (p.sales_status || 'new')"
                  @click.stop="updateProspectSalesStatus(
                    p,
                    p.sales_status==='new'
                      ? 'contacted'
                      : p.sales_status==='contacted'
                      ? 'qualified'
                      : p.sales_status==='qualified'
                      ? 'lost'
                      : 'new'
                  )"
                  style="cursor:pointer"
                  title="클릭 → 다음 단계"
                >
                  {{
                    p.sales_status==='new'
                      ? '🆕 신규'
                      : p.sales_status==='contacted'
                      ? '📞 접촉완료'
                      : p.sales_status==='qualified'
                      ? '✅ 검증완료'
                      : '❌ 소멸'
                  }}
                </span>
              </div>
            </div>

            <div class="cdt-pcard-body">
              <div class="cdt-pcard-name">{{ p.prospect_name }}</div>
              <div class="cdt-pcard-industry">
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                {{ p.industry }}
              </div>
            </div>

            <div class="cdt-pcard-signal">
              <div class="cdt-pcard-signal-label">
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                탐지 시그널
              </div>
              <div class="cdt-pcard-signal-text">{{ p.signal }}</div>
            </div>

            <div class="cdt-pcard-footer">
              <span class="cdt-pcard-source">
                <svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                </svg>
                {{ p.source }}
              </span>

              <span class="cdt-pcard-date">{{ p.detected_at }}</span>
            </div>

            <div v-if="p.note" class="cdt-pcard-note">{{ p.note }}</div>

            <a v-if="p.ref_url" :href="p.ref_url" target="_blank" class="cdt-pcard-link">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              원문 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});