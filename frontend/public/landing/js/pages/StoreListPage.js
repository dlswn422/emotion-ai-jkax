const { defineComponent, ref, computed } = Vue;
const { useRouter } = VueRouter;

import { STORES } from "../data/storesMock.js";
import { NavBar } from "../components/NavBar.js";
import { DateModal } from "../components/DateModal.js";
import { AlertPanel } from "../components/AlertPanel.js";

export const StoreListPage = defineComponent({
  name: "StoreListPage",
  components: { NavBar, AlertPanel, DateModal },

  setup() {
    const router = useRouter();

    // 매장 / 기업 검색어 상태
    const searchQ = ref("");
    const companySearchQ = ref("");

    // 날짜 선택 모달 상태
    const showModal = ref(false);
    const selectedStore = ref(null);

    // 안드로이드 기기 여부
    function isAndroidDevice() {
      return /Android/i.test(navigator.userAgent || "");
    }

    // 기업 목록만 추출
    const companies = computed(() =>
      STORES.filter((item) => item.type === "company"),
    );

    // 기업 검색 필터링
    const filteredCompanies = computed(() => {
      const q = companySearchQ.value.trim().toLowerCase();

      const baseCompanies = isAndroidDevice()
        ? companies.value.filter((company) => company.id === "store_7")
        : companies.value;

      return baseCompanies.filter((company) =>
        company.name.toLowerCase().includes(q),
      );
    });

    // 매장 목록만 추출
    const demoStores = computed(() =>
      STORES.filter((item) => item.type === "store"),
    );

    // 매장 검색 필터링
    const filteredStores = computed(() => {
      const q = searchQ.value.trim().toLowerCase();
      if (!q) return demoStores.value;

      return demoStores.value.filter(
        (store) =>
          store.name.toLowerCase().includes(q) ||
          store.address.toLowerCase().includes(q),
      );
    });

    const shouldShowStoreSection = computed(() => !isAndroidDevice());

    function getCompanyCardMeta(company) {
      if (company.id === "store_7") {
        return {
          name: "신일팜글래스(주)",
          logoMode: "text",
          logoText: "SG",
          logoBg: "#dbeafe",
          logoColor: "#1a5fa8",
          tags: ["의료용 유리용기 제조", "중견기업", "대한민국"],
          desc: "의료용 유리 앰플·바이알 전문 제조 · 월 3천만개 생산 · KRX 상장 (001380) · ISO 15378 인증 · 수출 40개국+",
          rating: "3.8",
          reviewCount: "124",
          ownReview: "자사리뷰 미설정",
          ownReviewColor: "#94a3b8",
          statusText: "Active",
          buttonText: "전체 대시보드 분석하기",
          pillExternal: "#3b82f6",
          pillOwnreview: "#f59e0b",
          pillCompetitive: "#f59e0b",
          pillInternal: "#8b5cf6",
        };
      }

      if (company.id === "store_6") {
        return {
          name: company.name,
          logoMode: "image",
          tags: [company.category, "소상공인", company.country].filter(Boolean),
          desc: company.description || "",
          rating:
            company.rating !== null && company.rating !== undefined
              ? String(company.rating)
              : "",
          reviewCount:
            typeof company.reviewCount === "number"
              ? company.reviewCount.toLocaleString()
              : "",
          ownReview:
            typeof company.reviewCount === "number" ? "자사리뷰 ✓" : "",
          ownReviewColor: "#10b981",
          statusText: "Active",
          buttonText: "매장 분석하기",
          pillExternal: "#3b82f6",
          pillOwnreview: "#10b981",
          pillCompetitive: "#f59e0b",
          pillInternal: "#94a3b8",
        };
      }

      return {
        name: company.name,
        logoMode: "image",
        tags: [],
        desc: company.description || "",
        rating: "",
        reviewCount: "",
        ownReview: "",
        ownReviewColor: "#94a3b8",
        statusText: company.status === "active" ? "운영중" : "설정중",
        buttonText: "전체 대시보드 분석하기",
        pillExternal: "#3b82f6",
        pillOwnreview: "#f59e0b",
        pillCompetitive: "#f59e0b",
        pillInternal: "#8b5cf6",
      };
    }

    function logoImageClass(companyId) {
      return [
        "company-logo-img",
        companyId === "store_6" ? "company-logo-img-up-sahabat" : "",
        companyId === "store_7" ? "company-logo-img-up-sinill" : "",
        companyId === "store_8" ? "company-logo-img-up-etoday" : "",
        companyId === "store_9" ? "company-logo-img-up-ck" : "",
        companyId === "store_10" ? "company-logo-img-up-goodai" : "",
      ];
    }

    /**
     * 분석 시작 버튼 클릭
     * 선택한 기업/매장을 모달 대상으로 저장하고 날짜 모달 오픈
     */
    function openAnalysis(store) {
      selectedStore.value = store;
      showModal.value = true;
    }

    /**
     * 날짜 선택 완료 시 리포트 페이지로 이동
     */
    function onConfirm(dates) {
      if (!selectedStore.value) return;

      // 신일팜글래스만 B2B 리포트로 보냄
      if (selectedStore.value.id === "store_7") {
        router.push({
          path: "/B2B-report/shinilpharm",
          query: {
            start: dates.start,
            end: dates.end,
          },
        });
        return;
      }

      // 나머지는 기존 매장/기업 리포트 흐름 유지
      router.push({
        path: `/report/${selectedStore.value.id}`,
        query: dates,
      });
    }

    return {
      searchQ,
      companySearchQ,
      companies,
      filteredCompanies,
      filteredStores,
      showModal,
      selectedStore,
      openAnalysis,
      onConfirm,
      getCompanyCardMeta,
      logoImageClass,
      shouldShowStoreSection,
    };
  },

  template: `
    <div>
      <!-- 상단 네비게이션 -->
      <NavBar page="stores" />
      <AlertPanel />

      <div class="page-shell">
        <div class="page-body">
          <!-- 페이지 헤더 -->
          <div class="page-hero-bar">
            <div>
              <h1 class="page-h1">기업 · 매장 분석 목록</h1>
              <p class="page-sub">
                기업 {{ filteredCompanies.length }}개 · 매장 {{ filteredStores.length }}개
              </p>
            </div>

            <button
              class="btn btn-brand"
              @click="filteredStores.length && openAnalysis(filteredStores[0])"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              최신 리뷰 동기화
            </button>
          </div>

          <!-- 기업 섹션 -->
          <section class="page-section">
            <div class="section-head">
              <h2 class="section-title">기업</h2>
              <p class="section-sub">현재 아래 기업 데이터는 데모용 목데이터입니다.</p>
            </div>

            <!-- 기업 검색 -->
            <div class="toolbar">
              <div class="search-field">
                <svg class="si" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="companySearchQ" placeholder="매장 이름 또는 주소 검색..." />
              </div>
            </div>

            <!-- 기업 카드 리스트 -->
            <div class="store-grid company-grid">
              <div
                v-for="company in filteredCompanies"
                :key="company.id"
                class="store-card company-card"
                @click="openAnalysis(company)"
              >
                <div class="b2b-comp-header">
                  <template v-if="getCompanyCardMeta(company).logoMode === 'text'">
                    <div
                      class="b2b-comp-logo"
                      :style="{
                        background: getCompanyCardMeta(company).logoBg,
                        color: getCompanyCardMeta(company).logoColor
                      }"
                    >
                      {{ getCompanyCardMeta(company).logoText }}
                    </div>
                  </template>

                  <template v-else>
                    <div class="company-logo-slot">
                      <img
                        v-if="company.logoSrc"
                        :src="company.logoSrc"
                        :alt="company.name"
                        :class="logoImageClass(company.id)"
                      />
                    </div>
                  </template>

                  <div class="b2b-comp-meta">
                    <div class="b2b-comp-name">{{ getCompanyCardMeta(company).name }}</div>

                    <div
                      v-if="getCompanyCardMeta(company).tags.length"
                      class="b2b-comp-tags"
                    >
                      <span
                        v-for="(tag, idx) in getCompanyCardMeta(company).tags"
                        :key="idx"
                        class="b2b-tag"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>

                  <span class="status-pill status-active">
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                      <circle cx="3" cy="3" r="3"/>
                    </svg>
                    {{ getCompanyCardMeta(company).statusText }}
                  </span>
                </div>

                <p class="b2b-comp-desc">{{ getCompanyCardMeta(company).desc }}</p>

                <div
                  v-if="getCompanyCardMeta(company).rating || getCompanyCardMeta(company).reviewCount || getCompanyCardMeta(company).ownReview"
                  class="b2b-comp-metrics"
                >
                  <div v-if="getCompanyCardMeta(company).rating" class="b2b-metric">
                    <span class="b2b-metric-icon" style="color:#f59e0b">★</span>
                    <span class="b2b-metric-val">{{ getCompanyCardMeta(company).rating }}</span>
                    <span class="b2b-metric-lbl">Google</span>
                  </div>

                  <div
                    v-if="getCompanyCardMeta(company).rating && (getCompanyCardMeta(company).reviewCount || getCompanyCardMeta(company).ownReview)"
                    class="b2b-metric-divider"
                  ></div>

                  <div v-if="getCompanyCardMeta(company).reviewCount" class="b2b-metric">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span class="b2b-metric-val">{{ getCompanyCardMeta(company).reviewCount }}</span>
                    <span class="b2b-metric-lbl">리뷰</span>
                  </div>

                  <div
                    v-if="getCompanyCardMeta(company).reviewCount && getCompanyCardMeta(company).ownReview"
                    class="b2b-metric-divider"
                  ></div>

                  <div v-if="getCompanyCardMeta(company).ownReview" class="b2b-metric">
                    <span
                      class="b2b-metric-lbl"
                      :style="{ color: getCompanyCardMeta(company).ownReviewColor, fontWeight: '600' }"
                    >
                      {{ getCompanyCardMeta(company).ownReview }}
                    </span>
                  </div>
                </div>

                <div class="b2b-pill-row">
                  <div class="b2b-dim-pill" :style="'--dc:' + getCompanyCardMeta(company).pillExternal">
                    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    고객동향
                  </div>

                  <div class="b2b-dim-pill" :style="'--dc:' + getCompanyCardMeta(company).pillOwnreview">
                    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    리뷰감정
                  </div>

                  <div class="b2b-dim-pill" :style="'--dc:' + getCompanyCardMeta(company).pillCompetitive">
                    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M12 20V10M18 20V4M6 20v-6"/>
                    </svg>
                    경쟁사
                  </div>

                  <div class="b2b-dim-pill" :style="'--dc:' + getCompanyCardMeta(company).pillInternal">
                    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
                    </svg>
                    직원감정
                  </div>
                </div>

                <button class="sc-cta company-btn" @click.stop="openAnalysis(company)">
                  {{ getCompanyCardMeta(company).buttonText }}
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          <!-- 매장 섹션 -->
          <section v-if="shouldShowStoreSection" class="page-section">
            <div class="section-head">
              <h2 class="section-title">매장</h2>
              <p class="section-sub">현재 아래 매장 데이터는 데모용 목데이터입니다.</p>
            </div>

            <!-- 매장 검색 -->
            <div class="toolbar">
              <div class="search-field">
                <svg class="si" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="searchQ" placeholder="매장 이름 또는 주소 검색..." />
              </div>
            </div>

            <!-- 매장 카드 리스트 -->
            <div class="store-grid">
              <div
                v-for="store in filteredStores"
                :key="store.id"
                class="store-card"
                @click="openAnalysis(store)"
              >
                <div class="sc-header">
                  <div class="sc-avatar">🏪</div>

                  <div class="sc-info">
                    <div class="sc-name">{{ store.name }}</div>
                    <div class="sc-addr">{{ store.address }}</div>
                  </div>

                  <span :class="['status-pill', store.status === 'active' ? 'status-active' : 'status-pending']">
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                      <circle cx="3" cy="3" r="3" />
                    </svg>
                    {{ store.status === 'active' ? '운영중' : '설정중' }}
                  </span>
                </div>

                <div class="sc-metrics">
                  <div class="sc-rating">
                    <span class="sc-star">★</span>
                    <span class="sc-rating-num">{{ store.rating }}</span>
                  </div>

                  <div class="sc-divider"></div>

                  <div class="sc-count">
                    리뷰 <strong>{{ store.reviewCount.toLocaleString() }}개</strong>
                  </div>

                  <div class="sc-divider"></div>

                  <div class="sc-count">{{ store.country }}</div>
                </div>

                <button class="sc-cta" @click.stop="openAnalysis(store)">
                  이 매장 리뷰 분석하기
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <!-- 새 매장 추가 카드 -->
              <div class="add-card" @click="$router.push('/')">
                <div class="add-card-icon">
                  <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
                <h3>새 매장 추가하기</h3>
                <p>Google Business Profile 연결</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- 날짜 선택 모달 -->
      <DateModal v-model="showModal" @confirm="onConfirm" />
    </div>
  `,
});
