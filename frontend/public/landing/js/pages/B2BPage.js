const { defineComponent, ref, computed, onMounted } = Vue;
const { useRouter } = VueRouter;

import { NavBar } from '../components/NavBar.js';
import { DateModal } from '../components/DateModal.js';
import { AlertPanel } from '../components/AlertPanel.js';

export const B2BPage = defineComponent({
  name: 'B2BPage',
  components: { NavBar, DateModal, AlertPanel },

  setup() {
    const router = useRouter();
    const searchQ = ref('');
    const showModal = ref(false);
    const selectedComp = ref(null);

    const B2B_COMPANIES = [
      {
        id: 'shinilpharm',
        name: '신일팜글래스(주)',
        industry: '의료용 유리용기 제조',
        size: '중견기업',
        country: '대한민국',
        logo: 'SG',
        logoColor: '#1a5fa8',
        logoBg: '#dbeafe',
        desc: '의료용 유리 앰풀·바이알 전문 제조 · 월 3천만개 생산 · KRX 상장 (001380) · ISO 15378 인증 · 수출 40개국+',
        hasOwnReview: false,
        googleRating: 3.8,
        reviewCount: 124,
        status: 'active',
        tabStatus: {
          external: 'ready',
          ownreview: 'wip',
          competitive: 'ready',
          internal: 'ready',
        },
      },
      {
        id: 'comp_1',
        name: 'Hyundai Motors Indonesia',
        industry: '자동차',
        size: '대기업',
        country: '인도네시아',
        logo: 'HM',
        logoColor: '#002C5F',
        logoBg: '#e8f0fe',
        desc: '현대자동차 인도네시아 법인 · 전국 120개 딜러십 네트워크',
        hasOwnReview: true,
        googleRating: 4.3,
        reviewCount: 2840,
        status: 'active',
        tabStatus: {
          external: 'ready',
          ownreview: 'ready',
          competitive: 'ready',
          internal: 'ready',
        },
      },
      {
        id: 'comp_2',
        name: 'BrightFin Fintech',
        industry: '핀테크',
        size: '중소기업',
        country: '싱가포르',
        logo: 'BF',
        logoColor: '#0ea5e9',
        logoBg: '#e0f2fe',
        desc: 'B2B 결제 SaaS 플랫폼 · 동남아시아 14개국 운영',
        hasOwnReview: false,
        googleRating: 4.1,
        reviewCount: 387,
        status: 'active',
        tabStatus: {
          external: 'ready',
          ownreview: 'disabled',
          competitive: 'ready',
          internal: 'disabled',
        },
      },
    ];

    const DB_STORE_FALLBACK = {
      loadAll() {},
      getTabStatus(compId, tabId) {
        const comp = B2B_COMPANIES.find(c => c.id === compId);
        return comp?.tabStatus?.[tabId] || 'ready';
      },
    };

    const DB_STORE_SAFE = globalThis.DB_STORE || DB_STORE_FALLBACK;
    const GLOBAL_TAB_STATUSES_SAFE = globalThis.GLOBAL_TAB_STATUSES || {};

    const filtered = computed(() =>
      B2B_COMPANIES.filter(c =>
        c.name.toLowerCase().includes(searchQ.value.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchQ.value.toLowerCase())
      )
    );

    function openAnalysis(comp) {
      selectedComp.value = comp;
      showModal.value = true;
    }

    function onConfirm(dates) {
      showModal.value = false;
      if (selectedComp.value) {
        router.push({
          path: `/B2B-report/${selectedComp.value.id}`,
          query: { start: dates.start, end: dates.end },
        });
      }
    }

    function compTabStatus(compId, tabId) {
      const dbStatus = DB_STORE_SAFE.getTabStatus(compId, tabId);
      if (dbStatus && dbStatus !== 'ready') return dbStatus;

      const globalStatus = (GLOBAL_TAB_STATUSES_SAFE[compId] || {})[tabId];
      if (globalStatus) return globalStatus;

      const comp = B2B_COMPANIES.find(c => c.id === compId);
      return comp?.tabStatus?.[tabId] || 'ready';
    }

    onMounted(() => {
      DB_STORE_SAFE.loadAll();
    });

    return {
      router,
      searchQ,
      filtered,
      showModal,
      selectedComp,
      openAnalysis,
      onConfirm,
      compTabStatus,
      DB_STORE: DB_STORE_SAFE,
      GLOBAL_TAB_STATUSES: GLOBAL_TAB_STATUSES_SAFE,
    };
  },

  template: `
  <div>
    <NavBar page="b2b"/>
    <AlertPanel/>
    <div class="page-shell">
      <div class="page-body">
        <div class="b2b-hero-bar">
          <div class="b2b-hero-left">
            <div class="b2b-hero-eyebrow">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              B2B 기업 평판 인텔리전스
            </div>
            <h1 class="b2b-hero-h1">기업 전체 CX를<br><em>하나의 대시보드</em>로</h1>
            <p class="b2b-hero-sub">고객 동향 · 자사 리뷰 · 경쟁사 포지션 · 직원 헬스를 통합 분석해<br>데이터 기반 의사결정을 지원합니다.</p>
          </div>

          <div class="b2b-kpi-strip">
            <div class="b2b-strip-item">
              <div class="b2b-strip-num">4</div>
              <div class="b2b-strip-lbl">분석 차원</div>
            </div>
            <div class="b2b-strip-item">
              <div class="b2b-strip-num">20+</div>
              <div class="b2b-strip-lbl">데이터 소스</div>
            </div>
            <div class="b2b-strip-item">
              <div class="b2b-strip-num">실시간</div>
              <div class="b2b-strip-lbl">평판 모니터링</div>
            </div>
          </div>
        </div>

        <div class="toolbar" style="margin-bottom:24px">
          <div class="search-field">
            <svg class="si" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQ" placeholder="기업명 또는 업종 검색..."/>
          </div>

          <div style="display:flex;gap:10px">
            <button
              class="btn btn-ghost btn-sm"
              @click="router.push('/admin')"
              style="border:1.5px solid #6366f1;color:#4f46e5"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Admin 관리
            </button>

            <button class="btn btn-brand btn-sm">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              새 기업 추가
            </button>
          </div>
        </div>

        <div class="b2b-company-grid">
          <div
            v-for="comp in filtered"
            :key="comp.id"
            class="b2b-comp-card"
            @click="openAnalysis(comp)"
          >
            <div class="b2b-comp-header">
              <div class="b2b-comp-logo" :style="{background:comp.logoBg,color:comp.logoColor}">
                {{comp.logo}}
              </div>

              <div class="b2b-comp-meta">
                <div class="b2b-comp-name">{{comp.name}}</div>
                <div class="b2b-comp-tags">
                  <span class="b2b-tag">{{comp.industry}}</span>
                  <span class="b2b-tag">{{comp.size}}</span>
                  <span class="b2b-tag">{{comp.country}}</span>
                </div>
              </div>

              <span class="status-pill status-active">
                <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                  <circle cx="3" cy="3" r="3"/>
                </svg>
                Active
              </span>
            </div>

            <p class="b2b-comp-desc">{{comp.desc}}</p>

            <div class="b2b-comp-metrics">
              <div class="b2b-metric">
                <span class="b2b-metric-icon" style="color:#f59e0b">★</span>
                <span class="b2b-metric-val">{{comp.googleRating}}</span>
                <span class="b2b-metric-lbl">Google</span>
              </div>

              <div class="b2b-metric-divider"></div>

              <div class="b2b-metric">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span class="b2b-metric-val">{{comp.reviewCount.toLocaleString()}}</span>
                <span class="b2b-metric-lbl">리뷰</span>
              </div>

              <div class="b2b-metric-divider"></div>

              <div class="b2b-metric">
                <span class="b2b-metric-lbl" :style="{color:comp.hasOwnReview ? '#10b981' : '#94a3b8',fontWeight:'600'}">
                  {{comp.hasOwnReview ? '자사리뷰 ✓' : '자사리뷰 미설정'}}
                </span>
              </div>
            </div>

            <div class="b2b-pill-row">
              <div
                class="b2b-dim-pill"
                :style="(compTabStatus(comp.id,'external')==='ready') ? '--dc:#3b82f6' : (compTabStatus(comp.id,'external')==='wip') ? '--dc:#d97706' : '--dc:#94a3b8'"
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                고객동향
                <svg v-if="compTabStatus(comp.id,'external')==='wip'" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>

              <div
                class="b2b-dim-pill"
                :style="(compTabStatus(comp.id,'ownreview')==='ready') ? '--dc:#10b981' : (compTabStatus(comp.id,'ownreview')==='wip') ? '--dc:#d97706' : '--dc:#94a3b8'"
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                리뷰감정
                <svg v-if="compTabStatus(comp.id,'ownreview')==='wip'" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>

              <div
                class="b2b-dim-pill"
                :style="(compTabStatus(comp.id,'competitive')==='ready') ? '--dc:#f59e0b' : (compTabStatus(comp.id,'competitive')==='wip') ? '--dc:#d97706' : '--dc:#94a3b8'"
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M12 20V10M18 20V4M6 20v-6"/>
                </svg>
                경쟁사
                <svg v-if="compTabStatus(comp.id,'competitive')==='wip'" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>

              <div
                class="b2b-dim-pill"
                :style="(compTabStatus(comp.id,'internal')==='ready') ? '--dc:#8b5cf6' : (compTabStatus(comp.id,'internal')==='wip') ? '--dc:#d97706' : '--dc:#94a3b8'"
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
                </svg>
                직원감정
                <svg v-if="compTabStatus(comp.id,'internal')==='wip'" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
            </div>

            <button class="sc-cta" @click.stop="openAnalysis(comp)">
              전체 대시보드 분석하기
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div class="add-card" @click="$router.push('/')">
            <div class="add-card-icon">
              <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
              </svg>
            </div>
            <h3>새 기업 추가하기</h3>
            <p>도메인 연결 · API 설정</p>
          </div>
        </div>
      </div>
    </div>

    <DateModal v-model="showModal" @confirm="onConfirm"/>
  </div>
  `,
});