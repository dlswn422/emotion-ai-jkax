const {
  defineComponent,
  ref,
  computed,
  nextTick,
  watch,
  onMounted,
  onUnmounted,
} = Vue;

// 공통 차트 정리 함수 / 고객 동향 분석 API 함수
import { destroyChart } from "./shared.js";
import { fetchDashboardCustomerTrend } from "../api/dashboardCustomerTrend.js";

export const B2BCustomerTrendSection = defineComponent({
  name: "B2BCustomerTrendSection",
  emits: ["loading-change"],

  props: {
    tenantId: { type: [String, Number], required: true },
    compId: { type: String, required: true },
    analysisPeriod: { type: Object, required: true },
  },

  setup(props, { emit }) {
    // 화면 토글 상태
    const kwChartMode = ref("rank");
    const prospectFilter = ref("");

    // 뷰포트 너비 및 모바일 키워드 카드 여부
    const viewportWidth = ref(window.innerWidth);
    const isMobileKeywordCard = computed(() => viewportWidth.value <= 600);

    function handleResize() {
      viewportWidth.value = window.innerWidth;
    }

    // 모바일 키워드 카드 확장 상태
    const expandedKeywordCard = ref(null);
    const overflowKeywordMap = ref({});
    let keywordResizeObserver = null;

    function getKeywordCardKey(kw, idx) {
      return String(kw?._id || kw?.keyword || idx);
    }

    function toggleKeywordCard(cardKey) {
      if (!overflowKeywordMap.value[cardKey]) return;

      expandedKeywordCard.value =
        expandedKeywordCard.value === cardKey ? null : cardKey;
    }

    function measureKeywordOverflow() {
      nextTick(() => {
        const rows = document.querySelectorAll(".cdt-kw-mobile-top");
        const nextMap = {};

        rows.forEach((rowEl) => {
          const cardKey = rowEl.dataset.cardKey;
          if (!cardKey) return;

          const rankEl = rowEl.querySelector(".cdt-kw-mobile-rank");
          const levelEl = rowEl.querySelector(".cdt-kw-mobile-level");
          const chipEl = rowEl.querySelector(".cdt-kw-chip");
          const measureEl = rowEl.querySelector(
            ".cdt-kw-mobile-keyword-measure",
          );

          if (!rankEl || !levelEl || !chipEl || !measureEl) {
            nextMap[cardKey] = false;
            return;
          }

          const rowStyle = window.getComputedStyle(rowEl);
          const gap =
            parseFloat(rowStyle.columnGap || rowStyle.gap || "0") || 0;

          const rowWidth = rowEl.clientWidth;
          const rankWidth = rankEl.getBoundingClientRect().width;
          const levelWidth = levelEl.getBoundingClientRect().width;

          const chipStyle = window.getComputedStyle(chipEl);
          const chipPaddingLeft = parseFloat(chipStyle.paddingLeft || "0") || 0;
          const chipPaddingRight =
            parseFloat(chipStyle.paddingRight || "0") || 0;
          const chipBorderLeft =
            parseFloat(chipStyle.borderLeftWidth || "0") || 0;
          const chipBorderRight =
            parseFloat(chipStyle.borderRightWidth || "0") || 0;

          const reservedWidth =
            rankWidth +
            levelWidth +
            gap * 2 +
            chipPaddingLeft +
            chipPaddingRight +
            chipBorderLeft +
            chipBorderRight +
            2;

          const availableTextWidth = Math.max(0, rowWidth - reservedWidth);
          const textWidth = Math.ceil(measureEl.getBoundingClientRect().width);

          nextMap[cardKey] = textWidth > availableTextWidth;
        });

        overflowKeywordMap.value = nextMap;

        if (expandedKeywordCard.value && !nextMap[expandedKeywordCard.value]) {
          expandedKeywordCard.value = null;
        }
      });
    }

    function setupKeywordResizeObserver() {
      if (keywordResizeObserver) {
        keywordResizeObserver.disconnect();
        keywordResizeObserver = null;
      }

      if (
        typeof window === "undefined" ||
        typeof window.ResizeObserver === "undefined"
      ) {
        return;
      }

      keywordResizeObserver = new ResizeObserver(() => {
        measureKeywordOverflow();
      });

      nextTick(() => {
        document.querySelectorAll(".cdt-kw-mobile-top").forEach((el) => {
          keywordResizeObserver?.observe(el);
        });
      });
    }

    // 실데이터 저장 상태
    const signalKeywords = ref([]);
    const prospects = ref([]);
    const dailyTrend = ref([]);
    const monthlyTrend = ref([]);

    // 차트 인스턴스
    let kwDailyChartInst = null;
    let kwMonthlyChartInst = null;

    // 화면에서 바로 쓰는 데이터 소스
    const signalKeywordsSource = computed(() => signalKeywords.value || []);
    const prospectsSource = computed(() => prospects.value || []);

    // 상단 KPI 계산
    const externalTopKpis = computed(() => {
      const signalKeywordRows = signalKeywordsSource.value;
      const prospectRows = prospectsSource.value;

      return {
        totalHits: signalKeywordRows.reduce(
          (s, k) => s + Number(k.hit_count || 0),
          0,
        ),
        activeKeywordCount: signalKeywordRows.filter((k) => k.active !== false)
          .length,
        prospectCount: prospectRows.length,
        highCount: prospectRows.filter((p) => p.opportunity_grade === "high")
          .length,
      };
    });

    // 키워드 표용 가공 데이터
    const externalKeywordRows = computed(() =>
      [...signalKeywordsSource.value]
        .filter((k) => k.active !== false)
        .sort((a, b) => Number(b.hit_count || 0) - Number(a.hit_count || 0))
        .map((row) => ({
          _id: row._id,
          keyword: row.keyword,
          kw_type: row.kw_type || "이벤트",
          signal_level: row.signal_level || "medium",
          hit_count: Number(row.hit_count || 0),
          last_hit: row.last_hit || props.analysisPeriod?.end || "",
          active: row.active,
        })),
    );

    // 신호 강도 포맷터
    function formatSignalLevel(level) {
      const normalized = String(level || "medium").toLowerCase();
      if (normalized === "high") return "HIGH";
      if (normalized === "medium") return "MEDIUM";
      return "LOW";
    }

    function formatLastHit(lastHit) {
      if (!lastHit) return "최근 탐지 없음";
      return `최근 탐지 ${lastHit}`;
    }

    // 고객 후보 필터링
    const filteredProspects = computed(() => {
      const base = prospectsSource.value;
      if (!prospectFilter.value) return base;
      return base.filter((x) => x.opportunity_grade === prospectFilter.value);
    });

    // 최근 14일 안에 실제 감지된 키워드 시리즈 상위 5개
    const dailyLegendRows = computed(() => {
      const recentSeriesMap = new Map();

      for (const row of dailyTrend.value) {
        const level = String(row.level || "MEDIUM").toUpperCase();
        const category = row.category || "이벤트";
        const key = `${row.keyword}__${category}__${level}`;

        if (!recentSeriesMap.has(key)) {
          recentSeriesMap.set(key, {
            keyword: row.keyword,
            category,
            level,
          });
        }
      }

      return Array.from(recentSeriesMap.values())
        .map((item) => {
          const total = dailyTrend.value
            .filter(
              (row) =>
                row.keyword === item.keyword &&
                (row.category || "이벤트") === item.category &&
                String(row.level || "MEDIUM").toUpperCase() === item.level,
            )
            .reduce((sum, row) => sum + Number(row.hit_count || 0), 0);

          return { ...item, total };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    });

    // 일별 추이 라인차트 생성
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
              ticks: {
                color: "#94a3b8",
                font: { size: 10 },
                stepSize: 1,
                precision: 0,
              },
            },
          },
        },
      });
    }

    // 월별 추이 바차트 생성
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
              ticks: {
                color: "#94a3b8",
                font: { size: 10 },
                stepSize: 1,
                precision: 0,
              },
            },
          },
        },
      });
    }

    // 일별 차트 데이터 생성
    async function buildKwDailyChart() {
      await nextTick();
      destroyChart(kwDailyChartInst);

      // 오늘 기준 최근 14일 라벨
      const endDate = new Date();
      const labels = [];
      const labelKeys = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);

        const month = d.getMonth() + 1;
        const day = d.getDate();

        labels.push(`${month}/${day}`);
        labelKeys.push(
          `${d.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );
      }

      const COLORS = ["#f43f5e", "#f59e0b", "#6366f1", "#10b981", "#8b5cf6"];

      // 최근 14일 안에 실제 감지된 키워드 상위 5개만 사용
      const rows = dailyLegendRows.value;

      // 날짜별 raw count 맵
      const dailyMap = new Map();
      for (const row of dailyTrend.value) {
        const level = String(row.level || "MEDIUM").toUpperCase();
        const category = row.category || "이벤트";
        const key = `${row.keyword}__${category}__${level}__${row.date}`;
        dailyMap.set(key, Number(row.hit_count || 0));
      }

      const datasets = rows.map((kw, idx) => {
        // 1) 날짜별 실제 발생 건수
        const rawData = labelKeys.map((dateKey) => {
          const key = `${kw.keyword}__${kw.category}__${kw.level}__${dateKey}`;
          return dailyMap.get(key) || 0;
        });

        // 2) 누적합으로 변환
        const cumulativeData = [];
        let running = 0;

        for (const value of rawData) {
          running += value;
          cumulativeData.push(running);
        }

        return {
          label: `${kw.keyword} (${kw.level})`,
          data: cumulativeData,
          borderColor: COLORS[idx % COLORS.length],
          backgroundColor: COLORS[idx % COLORS.length] + "15",
          fill: false,
          pointBackgroundColor: COLORS[idx % COLORS.length],
        };
      });

      kwDailyChartInst = makeLineChart("kwDailyChart", labels, datasets);
    }

    // 월별 차트 데이터 생성
    async function buildKwMonthlyChart() {
      await nextTick();
      destroyChart(kwMonthlyChartInst);

      const endDate = new Date();
      const labels = [];
      const monthKeys = [];

      // 오늘 기준 최근 6개월
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

      for (const row of monthlyTrend.value) {
        const idx = monthKeys.indexOf(row.month);
        if (idx === -1) continue;

        const hitCount = Number(row.hit_count || 0);
        const level = String(row.signal_level || "MEDIUM").toUpperCase();

        if (level === "HIGH") highData[idx] += hitCount;
        else if (level === "MEDIUM") medData[idx] += hitCount;
        else if (level === "LOW") lowData[idx] += hitCount;
      }

      kwMonthlyChartInst = makeBarChart("kwMonthlyChart", labels, [
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
    async function loadCustomerTrend() {
      emit("loading-change", true);

      try {
        const result = await fetchDashboardCustomerTrend(
          props.tenantId,
          props.analysisPeriod?.start,
          props.analysisPeriod?.end,
        );

        signalKeywords.value = Array.isArray(result?.signalKeywords)
          ? result.signalKeywords
          : [];

        prospects.value = Array.isArray(result?.prospects)
          ? result.prospects
          : [];

        dailyTrend.value = Array.isArray(result?.dailyTrend)
          ? result.dailyTrend
          : [];

        monthlyTrend.value = Array.isArray(result?.monthlyTrend)
          ? result.monthlyTrend
          : [];
      } catch (e) {
        console.error(e);
        signalKeywords.value = [];
        prospects.value = [];
        dailyTrend.value = [];
        monthlyTrend.value = [];
      } finally {
        emit("loading-change", false);
      }
    }

    // 차트 모드 변경 시 차트 다시 그림
    watch(kwChartMode, async (mode) => {
      if (mode === "daily") await buildKwDailyChart();
      if (mode === "monthly") await buildKwMonthlyChart();
    });

    // 모바일 키워드 카드 여부 변경 시 오버플로우 재측정
    watch(isMobileKeywordCard, async () => {
      expandedKeywordCard.value = null;
      await nextTick();
      measureKeywordOverflow();
      setupKeywordResizeObserver();
    });

    watch(
      externalKeywordRows,
      async () => {
        expandedKeywordCard.value = null;
        await nextTick();
        measureKeywordOverflow();
        setupKeywordResizeObserver();
      },
      { deep: true },
    );
    // 기업 / 기간 변경 시 API 재호출
    watch(
      () => [
        props.tenantId,
        props.compId,
        props.analysisPeriod?.start,
        props.analysisPeriod?.end,
      ],
      async () => {
        await loadCustomerTrend();
        await nextTick();

        if (kwChartMode.value === "daily") await buildKwDailyChart();
        if (kwChartMode.value === "monthly") await buildKwMonthlyChart();
        // 키워드 데이터 변경 시 오버플로우 재측정
        measureKeywordOverflow();
        setupKeywordResizeObserver();
      },
    );

    // 최초 진입 시 데이터 로드
    onMounted(async () => {
      window.addEventListener("resize", handleResize);

      await loadCustomerTrend();
      await nextTick();
      if (kwChartMode.value === "daily") await buildKwDailyChart();
      if (kwChartMode.value === "monthly") await buildKwMonthlyChart();
      measureKeywordOverflow();
      setupKeywordResizeObserver();
    });

    // 언마운트 시 리스너 제거 및 차트 인스턴스 정리
    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);

      if (keywordResizeObserver) {
        keywordResizeObserver.disconnect();
        keywordResizeObserver = null;
      }

      destroyChart(kwDailyChartInst);
      destroyChart(kwMonthlyChartInst);
    });

    return {
      kwChartMode,
      prospectFilter,
      signalKeywordsSource,
      prospectsSource,
      externalTopKpis,
      externalKeywordRows,
      filteredProspects,
      dailyTrend,
      dailyLegendRows,
      formatSignalLevel,
      formatLastHit,
      isMobileKeywordCard,
      expandedKeywordCard,
      overflowKeywordMap,
      getKeywordCardKey,
      toggleKeywordCard,
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
          <div
            v-if="!signalKeywordsSource.length"
            style="padding:20px;text-align:center;color:var(--text-4);font-size:13px"
          >
            Admin에서 시그널 키워드를 등록하세요
          </div>

          <template v-else>




      <template v-if="isMobileKeywordCard">
        <div class="cdt-kw-mobile-list">
          <div
            v-for="(kw, idx) in externalKeywordRows.slice(0, 10)"
            :key="'mobile-' + (kw._id || kw.keyword || idx)"
            class="cdt-kw-mobile-card"
            :class="{
              'cdt-kw-mobile-card-expandable':
                overflowKeywordMap[getKeywordCardKey(kw, idx)],
              'cdt-kw-mobile-card-expanded':
                expandedKeywordCard === getKeywordCardKey(kw, idx)
            }"
          >
            <div
              class="cdt-kw-mobile-top"
              :data-card-key="getKeywordCardKey(kw, idx)"
            >
              <div class="cdt-kw-mobile-rank">{{ idx + 1 }}</div>

              <div class="cdt-kw-mobile-keyword-wrap">
                <button
                  type="button"
                  class="cdt-kw-mobile-chip-btn"
                  :class="{
                    'is-expandable': overflowKeywordMap[getKeywordCardKey(kw, idx)],
                    'is-expanded': expandedKeywordCard === getKeywordCardKey(kw, idx)
                  }"
                  :disabled="!overflowKeywordMap[getKeywordCardKey(kw, idx)]"
                  @click.stop="toggleKeywordCard(getKeywordCardKey(kw, idx))"
                >
                  <span class="cdt-kw-chip" :class="'cdt-kw-' + kw.signal_level">
                    <span
                      class="cdt-kw-mobile-keyword-text"
                      :class="{
                        expanded: expandedKeywordCard === getKeywordCardKey(kw, idx)
                      }"
                      :title="kw.keyword"
                    >
                      {{ kw.keyword }}
                    </span>

                    <span class="cdt-kw-mobile-keyword-measure">
                      {{ kw.keyword }}
                    </span>
                  </span>
                </button>
              </div>

              <div class="cdt-kw-mobile-level">
                <span
                  class="cdt-signal-dot"
                  :class="'cdt-sig-' + kw.signal_level"
                ></span>
                <span
                  :style="{
                    fontSize: '11px',
                    fontWeight: '700',
                    color:
                      kw.signal_level === 'high'
                        ? '#f43f5e'
                        : kw.signal_level === 'medium'
                        ? '#f59e0b'
                        : '#94a3b8'
                  }"
                >
                  {{
                    kw.signal_level === 'high'
                      ? 'HIGH'
                      : kw.signal_level === 'medium'
                      ? 'MED'
                      : 'LOW'
                  }}
                </span>
              </div>
            </div>

            <div class="cdt-kw-mobile-meta">
              <div class="cdt-kw-mobile-meta-left">
                <span class="cdt-type-tag">{{ kw.kw_type || '이벤트' }}</span>
                <span class="cdt-hit-badge">히트 {{ kw.hit_count || 0 }}</span>
              </div>

              <span class="cdt-kw-mobile-date">
                최근 탐지 {{ kw.last_hit || '—' }}
              </span>
            </div>
          </div>
        </div>
      </template>

          <template v-else>
            <!-- PC 테이블 -->
            <table class="cdt-kw-table cdt-kw-table-desktop">
              <colgroup>
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>

              <thead>
                <tr>
                  <th>#</th>
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
                  <td>{{ idx + 1 }}</td>

                  <td>
                    <span class="cdt-kw-chip" :class="'cdt-kw-' + kw.signal_level">
                      {{ kw.keyword }}
                    </span>
                  </td>

                  <td>
                    <span class="cdt-type-tag">{{ kw.kw_type || '이벤트' }}</span>
                  </td>

                  <td>
                    <span
                      class="cdt-signal-dot"
                      :class="'cdt-sig-' + kw.signal_level"
                    ></span>
                    <span
                      :style="{
                        fontSize: '11px',
                        fontWeight: '700',
                        color:
                          kw.signal_level === 'high'
                            ? '#f43f5e'
                            : kw.signal_level === 'medium'
                            ? '#f59e0b'
                            : '#94a3b8'
                      }"
                    >
                      {{
                        kw.signal_level === 'high'
                          ? 'HIGH'
                          : kw.signal_level === 'medium'
                          ? 'MED'
                          : 'LOW'
                      }}
                    </span>
                  </td>

                  <td>
                    <span class="cdt-hit-badge">{{ kw.hit_count || 0 }}</span>
                  </td>

                  <td>{{ kw.last_hit || '—' }}</td>
                </tr>
              </tbody>
            </table>
            </template>
          </template>
        </template>

        <template v-else-if="kwChartMode==='daily'">
          <div class="cdt-trend-wrap">
            <div class="cdt-trend-info">
              <div class="cdt-trend-desc">최근 14일 실제 감지 키워드 히트 추이</div>
              <div class="cdt-trend-legend">
                <span
                  v-for="kw in dailyLegendRows"
                  :key="kw.keyword + '-' + kw.category + '-' + kw.level"
                  class="cdt-legend-item"
                >
                  <span
                    class="cdt-legend-dot"
                    :style="{
                      background:
                        kw.level === 'HIGH'
                          ? '#f43f5e'
                          : kw.level === 'MEDIUM'
                          ? '#f59e0b'
                          : '#6366f1'
                    }"
                  ></span>
                  {{ kw.keyword }} ({{ kw.level }})
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
              <div class="cdt-trend-desc">최근 6개월 HIGH / MED / LOW 시그널 히트 건수</div>
              <div class="cdt-trend-legend">
                <span class="cdt-legend-item">
                  <span class="cdt-legend-dot" style="background:#f43f5e"></span>
                  HIGH 시그널
                </span>
                <span class="cdt-legend-item">
                  <span class="cdt-legend-dot" style="background:#f59e0b"></span>
                  MED 시그널
                </span>
                <span class="cdt-legend-item">
                  <span class="cdt-legend-dot" style="background:#94a3b8"></span>
                  LOW 시그널
                </span>
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

              <div class="cdt-status-cycle" title="영업 상태 표시">
                <span
                  class="cdt-status-chip"
                  :class="'cdt-st-' + (p.sales_status || 'new')"
                  title="현재 영업 상태"
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
