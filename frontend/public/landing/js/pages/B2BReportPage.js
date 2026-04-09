const { defineComponent, ref, computed } = Vue;
const { useRouter, useRoute } = VueRouter;

import { NavBar } from "../components/NavBar.js";
import { AlertPanel } from "../components/AlertPanel.js";
import { DateModal } from "../components/DateModal.js";
import { B2BCustomerTrendSection } from "../b2b/B2BCustomerTrendSection.js";
import { B2BCompetitiveSection } from "../b2b/B2BCompetitiveSection.js";
import { B2BEmployeeEmotionSection } from "../b2b/B2BEmployeeEmotionSection.js";
import {
  B2B_COMPANIES,
  B2B_REPORTS,
  GLOBAL_TAB_STATUSES,
  detectAndCreateAlerts,
  fmtDate,
} from "../b2b/shared.js";

// snapshotKey → backend period_type 매핑
const SNAPSHOT_TO_PERIOD = {
  daily:     "1D",
  weekly:    "7D",
  monthly:   "30D",
  quarterly: "90D",
  yearly:    "365D",
  all:       "9999999999D",
};

// snapshotKey → 표시 라벨
const SNAPSHOT_LABELS = {
  daily:     "일간 분석",
  weekly:    "주간 분석",
  monthly:   "월간 분석",
  quarterly: "분기 분석",
  yearly:    "연간 분석",
  all:       "전체 누적",
};

export const B2BReportPage = defineComponent({
  name: "B2BReportPage",
  components: {
    NavBar,
    AlertPanel,
    DateModal,
    B2BCustomerTrendSection,
    B2BCompetitiveSection,
    B2BEmployeeEmotionSection,
  },

  setup() {
    const route = useRoute();
    const router = useRouter();

    const compId = route.params.id;
    const company = B2B_COMPANIES.find((c) => c.id === compId) || B2B_COMPANIES[0];
    const report  = B2B_REPORTS[compId] || B2B_REPORTS[B2B_COMPANIES[0].id];

    // URL query 또는 기본값(monthly=30D)으로 초기화
    const selectedSnapshot = ref(route.query.snapshot || "monthly");

    const periodType = computed(
      () => SNAPSHOT_TO_PERIOD[selectedSnapshot.value] || "30D"
    );

    const periodLabel = computed(
      () => SNAPSHOT_LABELS[selectedSnapshot.value] || "월간 분석"
    );

    const loading = ref(false);
    const activeTab = ref("external");
    const showPeriodModal = ref(false);

    const internalTopKpis = computed(() => {
      if (company.id === "shinilpharm") {
        return {
          signalCount: 16,
          reviewRating: "N/A",
          reviewSub: "데이터 미연동",
          competitiveRank: 3,
          competitorCount: 4,
          competitiveScore: 62,
          employeeScore: 12,
          employeeTrend: "+4",
        };
      }
      return {
        signalCount: 0,
        reviewRating: "N/A",
        reviewSub: "데이터 미연동",
        competitiveRank: "-",
        competitorCount: 0,
        competitiveScore: 0,
        employeeScore: 0,
        employeeTrend: "0",
      };
    });

    const TAB_DEFS = [
      {
        id: "external",
        label: "고객 동향 분석",
        icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7",
      },
      {
        id: "ownreview",
        label: "리뷰 감정 분석",
        icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        id: "competitive",
        label: "경쟁사 분석",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
      {
        id: "internal",
        label: "직원 감정 분석",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0",
      },
    ];

    const B2B_TABS = computed(() =>
      TAB_DEFS.map((t) => ({
        ...t,
        status: (GLOBAL_TAB_STATUSES[compId] || {})[t.id] || "ready",
      }))
    );

    function selectTab(tab) {
      if (tab.status === "disabled") return;
      activeTab.value = tab.id;
    }

    function printReport() {
      window.print();
    }

    // 새 DateModal: {snapshotKey, snapshotLabel} 수신
    function onPeriodConfirm({ snapshotKey }) {
      showPeriodModal.value = false;
      selectedSnapshot.value = snapshotKey;
      router.replace({
        query: { ...route.query, snapshot: snapshotKey },
      });
    }

    detectAndCreateAlerts(report, company.name, compId);

    return {
      router,
      company,
      report,
      loading,
      activeTab,
      B2B_TABS,
      periodType,
      periodLabel,
      showPeriodModal,
      selectTab,
      onPeriodConfirm,
      printReport,
      fmtDate,
      internalTopKpis,
    };
  },

  template: `
  <div>
    <NavBar page="b2b-report"/>
    <AlertPanel/>
    <DateModal v-model="showPeriodModal" @confirm="onPeriodConfirm"/>

    <div class="report-shell">
      <div class="report-layout">

        <aside class="report-sidenav">
          <div class="sidenav-store-info">
            <div class="b2b-sidenav-header">
              <div class="b2b-sidenav-logo" :style="{background:company.logoBg,color:company.logoColor}">
                {{company.logo}}
              </div>
              <div class="b2b-sidenav-name-wrap">
                <div class="sidenav-store-name" style="font-size:12px">{{company.name}}</div>
                <div class="sidenav-period" style="margin-top:4px">
                  <span class="chip chip-brand" style="font-size:10px;padding:2px 8px">
                    {{ periodLabel }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="sidenav-section-label">분석 차원</div>

          <button
            v-for="tab in B2B_TABS"
            :key="tab.id"
            :class="['sidenav-item', activeTab===tab.id ? 'active' : '', tab.status==='disabled' ? 'tab-disabled' : '', tab.status==='wip' ? 'tab-wip' : '']"
            @click="selectTab(tab)"
          >
            <span class="sni">
              <svg v-if="tab.status==='disabled'" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <svg v-else-if="tab.status==='wip'" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <svg v-else width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path :d="tab.icon"/>
              </svg>
            </span>
            <span style="flex:1">{{tab.label}}</span>
            <span v-if="tab.status==='wip'" class="tab-status-badge badge-wip">작업중</span>
            <span v-else-if="tab.status==='disabled'" class="tab-status-badge badge-disabled">미연동</span>
            <span v-else class="tab-status-badge badge-ready">●</span>
          </button>

          <div class="sidenav-export">
            <button class="sidenav-export-btn" @click="printReport">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              PDF 보고서 출력
            </button>
          </div>
        </aside>

        <main class="report-content" v-show="!loading">
          <div class="store-banner b2b-company-banner">
            <div class="b2b-banner-logo" :style="{background:company.logoBg,color:company.logoColor}">
              {{company.logo}}
            </div>
            <div class="sb-info">
              <div class="sb-name">{{company.name}}</div>
              <div class="sb-meta">
                <span class="sb-chip sb-chip-active">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>
                  Active
                </span>
                <span class="sb-chip">{{company.industry}}</span>
                <span class="sb-chip">{{company.size}}</span>
                <span class="sb-chip">{{company.country}}</span>
                <span class="sb-chip" :style="{color:company.hasOwnReview?'#10b981':'#94a3b8'}">
                  {{company.hasOwnReview ? '자사리뷰 연동됨' : '자사리뷰 미설정'}}
                </span>
                <template v-if="company.id==='shinilpharm'">
                  <span class="sb-chip" style="color:#0369a1">ISO 15378 인증</span>
                  <span class="sb-chip" style="color:#7c3aed">수출 40개국+</span>
                </template>
                <span class="sb-chip" style="color:#6366f1;font-weight:700">
                  {{ periodLabel }}
                </span>
              </div>
            </div>
            <div class="sb-actions">
              <button class="sb-btn sb-btn-glass" @click="router.push('/B2B')">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                기업 변경
              </button>
              <button class="sb-btn sb-btn-glass" @click="showPeriodModal=true">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                기간 변경
              </button>
              <button class="sb-btn sb-btn-solid" @click="printReport">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                PDF 출력
              </button>
            </div>
          </div>

          <div v-show="activeTab==='external'">
            <B2BCustomerTrendSection
              :tenant-id="company.tenant_id"
              :comp-id="company.id"
              :period-type="periodType"
            />
          </div>

          <div v-show="activeTab==='ownreview'" class="tab-status-screen wip" style="margin-top:18px">
            <div class="tab-screen-badge wip">작업중</div>
            <h2 class="tab-screen-title">리뷰 감정 분석 탭은 다음 단계에서 맞출 예정</h2>
          </div>

          <div v-show="activeTab==='competitive'">
            <B2BCompetitiveSection
              :tenant-id="company.tenant_id"
              :comp-id="company.id"
              :period-type="periodType"
            />
          </div>

          <div v-show="activeTab==='internal'">
            <div class="b2b-top-kpi" style="margin-bottom:20px">
              <div class="b2b-tkpi">
                <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#8b5cf6,#a78bfa)">
                  <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <div class="b2b-tkpi-label">고객 동향 신호</div>
                  <div class="b2b-tkpi-val" style="color:#8b5cf6">{{ internalTopKpis.signalCount }}<span class="b2b-tkpi-unit">개</span></div>
                  <div class="b2b-tkpi-trend">모니터링 키워드</div>
                </div>
              </div>
              <div class="b2b-tkpi">
                <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#94a3b8,#cbd5e1)">
                  <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div>
                  <div class="b2b-tkpi-label">리뷰 감정 평점</div>
                  <div class="b2b-tkpi-val" style="color:#94a3b8">{{ internalTopKpis.reviewRating }}</div>
                  <div class="b2b-tkpi-trend" style="color:#94a3b8">{{ internalTopKpis.reviewSub }}</div>
                </div>
              </div>
              <div class="b2b-tkpi">
                <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">
                  <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20V10M18 20V4M6 20v-6"/></svg>
                </div>
                <div>
                  <div class="b2b-tkpi-label">경쟁사 대비 순위</div>
                  <div class="b2b-tkpi-val" style="color:#f59e0b">{{ internalTopKpis.competitiveRank }}위<span class="b2b-tkpi-unit">/ {{ internalTopKpis.competitorCount }}개사</span></div>
                  <div class="b2b-tkpi-trend">점수 {{ internalTopKpis.competitiveScore }}점</div>
                </div>
              </div>
              <div class="b2b-tkpi">
                <div class="b2b-tkpi-icon" style="background:linear-gradient(135deg,#8b5cf6,#a78bfa)">
                  <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>
                </div>
                <div>
                  <div class="b2b-tkpi-label">직원 감정 분석</div>
                  <div class="b2b-tkpi-val" style="color:#8b5cf6">{{ internalTopKpis.employeeScore }}</div>
                  <div class="b2b-tkpi-trend">▲ {{ internalTopKpis.employeeTrend }}p 전월 대비</div>
                </div>
              </div>
            </div>
            <B2BEmployeeEmotionSection
              :comp-id="company.id"
              :period-type="periodType"
            />
          </div>
        </main>
      </div>
    </div>
  </div>
  `,
});