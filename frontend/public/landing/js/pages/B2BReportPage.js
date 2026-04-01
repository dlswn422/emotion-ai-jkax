const { defineComponent, ref, computed } = Vue;
const { useRouter, useRoute } = VueRouter;

import { NavBar } from '../components/NavBar.js';
import { AlertPanel } from '../components/AlertPanel.js';
import { DateModal } from '../components/DateModal.js';
import { B2BCustomerTrendSection } from '../B2B/B2BCustomerTrendSection.js';
import { B2BCompetitiveSection } from '../B2B/B2BCompetitiveSection.js';
import {
  B2B_COMPANIES,
  B2B_REPORTS,
  GLOBAL_TAB_STATUSES,
  detectAndCreateAlerts,
  fmtDate,
} from '../B2B/shared.js';

export const B2BReportPage = defineComponent({
  name: 'B2BReportPage',
  components: {
    NavBar,
    AlertPanel,
    DateModal,
    B2BCustomerTrendSection,
    B2BCompetitiveSection,
  },

  setup() {
    const route = useRoute();
    const router = useRouter();

    const compId = route.params.id;
    const company = B2B_COMPANIES.find((c) => c.id === compId) || B2B_COMPANIES[0];
    const report = B2B_REPORTS[compId] || B2B_REPORTS[B2B_COMPANIES[0].id];

    const selectedStart = route.query.start || report.period.start;
    const selectedEnd = route.query.end || report.period.end;
    const analysisPeriod = { start: selectedStart, end: selectedEnd };

    const periodDays = computed(() => {
      const ms = new Date(selectedEnd) - new Date(selectedStart);
      return Math.round(ms / (1000 * 60 * 60 * 24));
    });

    const loading = ref(false);
    const activeTab = ref('external');
    const showPeriodModal = ref(false);

    const TAB_DEFS = [
      {
        id: 'external',
        label: '고객 동향 분석',
        icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7',
      },
      {
        id: 'ownreview',
        label: '리뷰 감정 분석',
        icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        id: 'competitive',
        label: '경쟁사 분석',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        id: 'internal',
        label: '직원 감정 분석',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
      },
    ];

    const B2B_TABS = computed(() =>
      TAB_DEFS.map((t) => ({
        ...t,
        status: (GLOBAL_TAB_STATUSES[compId] || {})[t.id] || 'ready',
      }))
    );

    function selectTab(tab) {
      if (tab.status === 'disabled') return;
      activeTab.value = tab.id;
    }

    function printReport() {
      window.print();
    }

    function onPeriodConfirm(dates) {
      showPeriodModal.value = false;
      router.push({
        path: `/B2B-report/${compId}`,
        query: { start: dates.start, end: dates.end },
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
      analysisPeriod,
      periodDays,
      showPeriodModal,
      selectTab,
      onPeriodConfirm,
      printReport,
      fmtDate,
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

                <div class="sidenav-period" style="margin-top:2px">
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="opacity:.6">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {{fmtDate(analysisPeriod.start)}} ~ {{fmtDate(analysisPeriod.end)}}
                </div>

                <div style="margin-top:4px">
                  <span class="chip chip-brand" style="font-size:10px;padding:2px 8px">{{periodDays}}일 분석</span>
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
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <svg v-else-if="tab.status==='wip'" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
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
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                    <circle cx="3" cy="3" r="3"/>
                  </svg>
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
                  <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;margin-right:3px">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {{fmtDate(analysisPeriod.start)}} ~ {{fmtDate(analysisPeriod.end)}}
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
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
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
              :comp-id="company.id"
              :analysis-period="analysisPeriod"
            />
          </div>

          <div v-show="activeTab==='ownreview'" class="tab-status-screen wip" style="margin-top:18px">
            <div class="tab-screen-badge wip">작업중</div>
            <h2 class="tab-screen-title">리뷰 감정 분석 탭은 다음 단계에서 맞출 예정</h2>
          </div>

          <div v-show="activeTab==='competitive'">
            <B2BCompetitiveSection
              :comp-id="company.id"
              :analysis-period="analysisPeriod"
            />
          </div>

          <div v-show="activeTab==='internal'" class="tab-status-screen wip" style="margin-top:18px">
            <div class="tab-screen-badge wip">작업중</div>
            <h2 class="tab-screen-title">직원 감정 분석 탭은 다음 단계에서 맞출 예정</h2>
          </div>
        </main>
      </div>
    </div>
  </div>
  `,
});