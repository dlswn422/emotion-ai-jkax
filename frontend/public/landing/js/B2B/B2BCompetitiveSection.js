const {
  defineComponent,
  ref,
  computed,
  nextTick,
  watch,
  onMounted,
  onUnmounted,
} = Vue;

import { destroyChart } from "./Shared.js";
import { fetchDashboardCompetitorAnalysis } from "../api/dashboardCompetitorAnalysis.js";

export const B2BCompetitiveSection = defineComponent({
  name: "B2BCompetitiveSection",

  props: {
    tenantId: { type: [String, Number], required: true },
    compId: { type: String, required: true },
    analysisPeriod: { type: Object, required: true },
  },

  setup(props) {
    // 화면 토글 상태
    const compChartMode = ref("rank");
    const compDetailFilter = ref("all");

    // 실데이터 저장 상태
    const issueSources = ref([]);
    const issueKeywords = ref([]);

    let compIssueDailyChartInst = null;
    let compIssueMonthlyChartInst = null;

    const dbCompIssueSources = computed(() => issueSources.value || []);
    const dbCompIssueKeywords = computed(() => issueKeywords.value || []);

    const activeKeywords = computed(() =>
      [...dbCompIssueKeywords.value].filter((k) => k.active !== false)
    );

    const activeSources = computed(() =>
      [...dbCompIssueSources.value].filter((s) => s.active !== false)
    );

    // 상단 KPI 계산
    const topKpis = computed(() => {
      const keywords = activeKeywords.value;
      const totalHits = keywords.reduce(
        (sum, row) => sum + Number(row.hit_count || 0),
        0
      );
      const highCount = keywords.filter(
        (row) => row.signal_level === "high"
      ).length;

      return {
        totalHits,
        highCount,
        sourceCount: activeSources.value.length,
        keywordCount: keywords.length,
      };
    });

    const sortedKeywords = computed(() =>
      [...activeKeywords.value].sort(
        (a, b) => Number(b.hit_count || 0) - Number(a.hit_count || 0)
      )
    );

    const filteredDetailRows = computed(() => {
      const rows = [...activeKeywords.value];
      if (compDetailFilter.value === "all") return rows;
      return rows.filter(
        (row) => row.signal_level === compDetailFilter.value
      );
    });

    function makeLineChart(canvasId, labels, datasets) {
      const el = document.getElementById(canvasId);
      if (!el) return null;

      return new Chart(el, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: true,
              position: "top",
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
              ticks: { color: "#94a3b8", font: { size: 10 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,.05)" },
              ticks: { color: "#94a3b8", font: { size: 10 }, stepSize: 1 },
            },
          },
        },
      });
    }

    function makeBarChart(canvasId, labels, datasets) {
      const el = document.getElementById(canvasId);
      if (!el) return null;

      return new Chart(el, {
        type: "bar",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: { boxWidth: 10, font: { size: 11 } },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: "#94a3b8", font: { size: 11 } },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,.05)" },
              ticks: { color: "#94a3b8", font: { size: 10 } },
            },
          },
        },
      });
    }

    async function buildCompIssueDailyChart() {
      await nextTick();
      destroyChart(compIssueDailyChartInst);

      const rows = sortedKeywords.value.slice(0, 5);

      const endDate = props.analysisPeriod?.end
        ? new Date(props.analysisPeriod.end)
        : new Date();

      const labels = [];
      const labelKeys = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);

        const month = d.getMonth() + 1;
        const day = d.getDate();

        labels.push(`${month}/${day}`);
        labelKeys.push(
          `${d.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        );
      }

      const COLORS = ["#f43f5e", "#f59e0b", "#6366f1", "#10b981", "#8b5cf6"];

      const datasets = rows.map((kw, idx) => {
        const data = new Array(labels.length).fill(0);
        const hitCount = Number(kw.hit_count || 0);

        if (kw.last_hit) {
          const hitDate = new Date(kw.last_hit);
          const hitKey = `${hitDate.getFullYear()}-${String(hitDate.getMonth() + 1).padStart(2, "0")}-${String(hitDate.getDate()).padStart(2, "0")}`;
          const hitIdx = labelKeys.indexOf(hitKey);

          if (hitIdx !== -1) {
            data[hitIdx] = hitCount;
          }
        }

        return {
          label: kw.keyword,
          data,
          borderColor: COLORS[idx % COLORS.length],
          backgroundColor: COLORS[idx % COLORS.length] + "15",
          fill: false,
          pointBackgroundColor: COLORS[idx % COLORS.length],
        };
      });

      compIssueDailyChartInst = makeLineChart(
        "compIssueDailyChart",
        labels,
        datasets
      );
    }

    async function buildCompIssueMonthlyChart() {
      await nextTick();
      destroyChart(compIssueMonthlyChartInst);

      const rows = activeKeywords.value;

      const endDate = props.analysisPeriod?.end
        ? new Date(props.analysisPeriod.end)
        : new Date();

      const labels = [];
      const monthKeys = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(endDate);
        d.setMonth(endDate.getMonth() - i);

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthKeys.push(key);
        labels.push(`${d.getMonth() + 1}월`);
      }

      const highData = new Array(labels.length).fill(0);
      const medData = new Array(labels.length).fill(0);
      const lowData = new Array(labels.length).fill(0);

      rows.forEach((row) => {
        if (!row.last_hit) return;

        const d = new Date(row.last_hit);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const idx = monthKeys.indexOf(key);

        if (idx === -1) return;

        const hitCount = Number(row.hit_count || 0);

        if (row.signal_level === "high") highData[idx] += hitCount;
        else if (row.signal_level === "medium") medData[idx] += hitCount;
        else lowData[idx] += hitCount;
      });

      compIssueMonthlyChartInst = makeBarChart("compIssueMonthlyChart", labels, [
        {
          label: "HIGH",
          data: highData,
          backgroundColor: "rgba(244,63,94,.8)",
          borderRadius: 5,
        },
        {
          label: "MED",
          data: medData,
          backgroundColor: "rgba(245,158,11,.7)",
          borderRadius: 5,
        },
        {
          label: "LOW",
          data: lowData,
          backgroundColor: "rgba(148,163,184,.5)",
          borderRadius: 5,
        },
      ]);
    }

    // API 호출부
    async function loadCompetitorAnalysis() {
      try {
        const result = await fetchDashboardCompetitorAnalysis(
          props.tenantId,
          props.analysisPeriod?.start,
          props.analysisPeriod?.end
        );

        issueSources.value = Array.isArray(result?.issueSources)
          ? result.issueSources
          : [];
        issueKeywords.value = Array.isArray(result?.issueKeywords)
          ? result.issueKeywords
          : [];
      } catch (error) {
        console.error(error);
        issueSources.value = [];
        issueKeywords.value = [];
      }

      await nextTick();

      if (compChartMode.value === "daily") {
        await buildCompIssueDailyChart();
      }

      if (compChartMode.value === "monthly") {
        await buildCompIssueMonthlyChart();
      }
    }

    watch(compChartMode, async (mode) => {
      if (mode === "daily") await buildCompIssueDailyChart();
      if (mode === "monthly") await buildCompIssueMonthlyChart();
    });

    // 기업 / 기간 변경 시 API 재호출
    watch(
      () => [
        props.tenantId,
        props.compId,
        props.analysisPeriod?.start,
        props.analysisPeriod?.end,
      ],
      async () => {
        await loadCompetitorAnalysis();
      }
    );

    // 최초 진입 시 데이터 로드
    onMounted(async () => {
      await loadCompetitorAnalysis();
    });

    onUnmounted(() => {
      destroyChart(compIssueDailyChartInst);
      destroyChart(compIssueMonthlyChartInst);
    });

    return {
      compChartMode,
      compDetailFilter,
      dbCompIssueSources,
      dbCompIssueKeywords,
      activeKeywords,
      sortedKeywords,
      filteredDetailRows,
      topKpis,
    };
  },

  template: `
  <div>
    <div class="b2b-top-kpi b2b-top-kpi-external">
      <div class="b2b-tkpi b2b-tkpi-wide">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">누적 이슈 히트</div>
          <div class="b2b-tkpi-val" style="color:#f43f5e">
            {{topKpis.totalHits}}<span class="b2b-tkpi-unit">건</span>
          </div>
          <div class="b2b-tkpi-trend" style="color:#10b981">HIGH {{topKpis.highCount}}개 키워드</div>
        </div>
      </div>

      <div class="b2b-tkpi b2b-tkpi-wide">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#6366f1,#818cf8)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">활성 감지 소스</div>
          <div class="b2b-tkpi-val" style="color:#6366f1">
            {{topKpis.sourceCount}}<span class="b2b-tkpi-unit">개</span>
          </div>
          <div class="b2b-tkpi-trend" style="color:#10b981">전체 {{topKpis.sourceCount}}개 소스</div>
        </div>
      </div>

      <div class="b2b-tkpi b2b-tkpi-wide">
        <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
          </svg>
        </div>
        <div>
          <div class="b2b-tkpi-label">모니터링 키워드</div>
          <div class="b2b-tkpi-val" style="color:#f59e0b">
            {{topKpis.keywordCount}}<span class="b2b-tkpi-unit">개</span>
          </div>
          <div class="b2b-tkpi-trend" style="color:#10b981">실시간 감지 중</div>
        </div>
      </div>
    </div>

    <div class="r-card" style="margin-bottom:20px">
      <div class="r-card-hd">
        <div class="r-card-title">
          <div class="r-title-icon ic-amber">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          경쟁사 이슈 키워드 감지 히트 현황
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <span class="chip chip-neutral">{{activeKeywords.length}}개 모니터링</span>

          <div class="cdt-chart-toggle">
            <button :class="['cdt-toggle-btn', compChartMode==='rank'?'active':'']" @click="compChartMode='rank'">순위</button>
            <button :class="['cdt-toggle-btn', compChartMode==='daily'?'active':'']" @click="compChartMode='daily'">일별 추이</button>
            <button :class="['cdt-toggle-btn', compChartMode==='monthly'?'active':'']" @click="compChartMode='monthly'">월별 추이</button>
          </div>
        </div>
      </div>

      <div class="r-card-body" style="padding:0">
        <template v-if="compChartMode==='rank'">
          <div v-if="!dbCompIssueKeywords.length" style="padding:32px;text-align:center;color:var(--text-4);font-size:13px">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 10px;display:block;opacity:.35">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Admin → 이슈 키워드 탭에서 감지 키워드를 등록하세요
          </div>

          <div v-else class="ci-kw-table-wrap">
            <div class="ci-kw-thead">
              <span class="ci-kw-col ci-kw-col-rank">#</span>
              <span class="ci-kw-col ci-kw-col-kw">키워드</span>
              <span class="ci-kw-col ci-kw-col-type">유형</span>
              <span class="ci-kw-col ci-kw-col-lv">강도</span>
              <span class="ci-kw-col ci-kw-col-hit">히트수</span>
              <span class="ci-kw-col ci-kw-col-date">최근 탐지</span>
            </div>

            <div
              v-for="(kw, idx) in sortedKeywords"
              :key="kw._id || idx"
              :class="['ci-kw-row', kw.signal_level==='high' ? 'ci-kw-row-high' : kw.signal_level==='medium' ? 'ci-kw-row-med' : '']"
            >
              <div class="ci-kw-col ci-kw-col-rank">
                <span class="ci-kw-rank-badge" :class="idx===0?'ci-rank-gold':idx===1?'ci-rank-silver':idx===2?'ci-rank-bronze':''">{{idx+1}}</span>
              </div>

              <div class="ci-kw-col ci-kw-col-kw">
                <span class="cdt-kw-chip" :class="'cdt-kw-'+kw.signal_level">{{kw.keyword}}</span>
              </div>

              <div class="ci-kw-col ci-kw-col-type">
                <span class="ci-kw-type-tag">{{kw.source_name || '—'}}</span>
              </div>

              <div class="ci-kw-col ci-kw-col-lv">
                <span class="ci-lv-pill" :class="'ci-lv-'+kw.signal_level">
                  <span class="ci-lv-dot"></span>
                  {{kw.signal_level==='high'?'HIGH':kw.signal_level==='medium'?'MED':'LOW'}}
                </span>
              </div>

              <div class="ci-kw-col ci-kw-col-hit">
                <div class="ci-hit-wrap">
                  <span class="ci-hit-num" :style="{color:kw.signal_level==='high'?'#f43f5e':kw.signal_level==='medium'?'#f59e0b':'#64748b'}">{{kw.hit_count||0}}</span>
                  <div class="ci-hit-bar-bg">
                    <div
                      class="ci-hit-bar-fill"
                      :style="{
                        width: sortedKeywords.length
                          ? Math.min(100, Math.round(((kw.hit_count||0) / Math.max(...sortedKeywords.map(k=>k.hit_count||0), 1)) * 100)) + '%'
                          : '0%',
                        background: kw.signal_level==='high'?'#f43f5e':kw.signal_level==='medium'?'#f59e0b':'#94a3b8'
                      }"
                    ></div>
                  </div>
                </div>
              </div>

              <div class="ci-kw-col ci-kw-col-date">
                <span class="ci-date-text">{{kw.last_hit || '—'}}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="compChartMode==='daily'">
          <div class="cdt-trend-wrap">
            <div class="cdt-trend-info">
              <div class="cdt-trend-desc">최근 14일 · 상위 5개 이슈 키워드 히트 추이</div>

              <div class="cdt-trend-legend">
                <span
                  v-for="kw in sortedKeywords.slice(0,5)"
                  :key="kw._id || kw.keyword"
                  class="cdt-legend-item"
                >
                  <span class="cdt-legend-dot" :style="{background:kw.signal_level==='high'?'#f43f5e':kw.signal_level==='medium'?'#f59e0b':'#94a3b8'}"></span>
                  {{kw.keyword}}
                </span>
              </div>
            </div>

            <div class="cdt-trend-chart-area">
              <canvas id="compIssueDailyChart" height="240"></canvas>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="cdt-trend-wrap">
            <div class="cdt-trend-info">
              <div class="cdt-trend-desc">최근 6개월 · 시그널 레벨별 이슈 히트 건수</div>

              <div class="cdt-trend-legend">
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#f43f5e"></span>HIGH</span>
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#f59e0b"></span>MED</span>
                <span class="cdt-legend-item"><span class="cdt-legend-dot" style="background:#94a3b8"></span>LOW</span>
              </div>
            </div>

            <div class="cdt-trend-chart-area">
              <canvas id="compIssueMonthlyChart" height="240"></canvas>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="r-card" style="margin-bottom:20px">
      <div class="r-card-hd">
        <div class="r-card-title">
          <div class="r-title-icon" style="background:#f0fdf4">
            <svg width="14" height="14" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          경쟁사 현황 상세
        </div>

        <div class="ci-detail-tabs">
          <button :class="['ci-dtab', compDetailFilter==='all'?'ci-dtab-active':'']" @click="compDetailFilter='all'">
            전체 <span class="ci-dtab-cnt">{{dbCompIssueKeywords.length}}</span>
          </button>
          <button :class="['ci-dtab', compDetailFilter==='high'?'ci-dtab-active ci-dtab-high':'']" @click="compDetailFilter='high'">
            High <span class="ci-dtab-cnt">{{dbCompIssueKeywords.filter(k=>k.signal_level==='high').length}}</span>
          </button>
          <button :class="['ci-dtab', compDetailFilter==='medium'?'ci-dtab-active ci-dtab-mid':'']" @click="compDetailFilter='medium'">
            Mid <span class="ci-dtab-cnt">{{dbCompIssueKeywords.filter(k=>k.signal_level==='medium').length}}</span>
          </button>
        </div>
      </div>

      <div class="r-card-body" style="padding:0">
        <div v-if="!dbCompIssueKeywords.length" style="padding:32px;text-align:center;color:var(--text-4);font-size:13px">
          <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 10px;display:block;opacity:.35">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          등록된 키워드가 없습니다
        </div>

        <div v-else class="ci-detail-table-wrap">
          <div class="ci-detail-thead">
            <span class="ci-detail-col ci-dc-kw">키워드</span>
            <span class="ci-detail-col ci-dc-comp">경쟁사명</span>
            <span class="ci-detail-col ci-dc-src">출처 링크</span>
            <span class="ci-detail-col ci-dc-opp">기회 내용</span>
            <span class="ci-detail-col ci-dc-date">최근 탐지</span>
          </div>

          <div
            v-for="kw in [...filteredDetailRows].sort((a,b)=>(b.hit_count||0)-(a.hit_count||0))"
            :key="'det-'+(kw._id || kw.keyword)"
            :class="['ci-detail-row', !kw.active ? 'ci-detail-inactive' : '']"
          >
            <div class="ci-detail-col ci-dc-kw">
              <span class="cdt-kw-chip" :class="'cdt-kw-'+kw.signal_level">{{kw.keyword}}</span>
              <span class="ci-hit-badge-sm">{{kw.hit_count||0}}건</span>
            </div>

            <div class="ci-detail-col ci-dc-comp">
              <span v-if="kw.competitor_name" class="ci-comp-name-tag">{{kw.competitor_name}}</span>
              <span v-else class="ci-null-text">—</span>
            </div>

            <div class="ci-detail-col ci-dc-src">
              <template v-if="dbCompIssueSources.find(s => s.site_name === kw.source_name)">
                <a
                  :href="dbCompIssueSources.find(s => s.site_name === kw.source_name).url"
                  target="_blank"
                  rel="noopener"
                  class="ci-detail-src-link"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  {{kw.source_name}}
                </a>
              </template>

              <span v-else-if="kw.source_name" class="ci-src-tag">{{kw.source_name}}</span>
              <span v-else class="ci-null-text">—</span>
            </div>

            <div class="ci-detail-col ci-dc-opp">
              <span v-if="kw.opportunity" class="ci-opp-text">{{kw.opportunity}}</span>
              <span v-else class="ci-null-text">—</span>
            </div>

            <div class="ci-detail-col ci-dc-date">
              <span class="ci-date-text">{{kw.last_hit || '—'}}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
});