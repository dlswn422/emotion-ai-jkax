const { defineComponent, ref, computed } = Vue;
const { useRouter } = VueRouter;

import { STORES } from "../data/storesMock.js";
import { NavBar } from "../components/NavBar.js";
import { DateModal } from "../components/DateModal.js";

export const StoreListPage = defineComponent({
  name: "StoreListPage",
  components: { NavBar, DateModal },

  setup() {
    const router = useRouter();

    // 매장 / 기업 검색어 상태
    const searchQ = ref("");
    const companySearchQ = ref("");

    // 날짜 선택 모달 상태
    const showModal = ref(false);
    const selectedStore = ref(null);

    // 기업 목록만 추출
    const companies = computed(() =>
      STORES.filter((item) => item.type === "company"),
    );

    // 기업 검색 필터링
    const filteredCompanies = computed(() => {
      const q = companySearchQ.value.trim().toLowerCase();
      if (!q) return companies.value;

      return companies.value.filter((company) =>
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
      if (selectedStore.value) {
        router.push({
          path: `/report/${selectedStore.value.id}`,
          query: dates,
        });
      }
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
    };
  },

  template: `
    <div>
      <!-- 상단 네비게이션 -->
      <NavBar page="stores" />

      <div class="page-shell">
        <div class="page-body">
          <!-- 데모 데이터 안내 배너 -->
       

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
                <div class="sc-header">
                  <div class="company-logo-slot">
                    <img
                      v-if="company.logoSrc"
                      :src="company.logoSrc"
                      :alt="company.name"
                      :class="[
                        company.id === 'store_6' ? 'company-logo-img-up-sahabat' : '',
                        company.id === 'store_7' ? 'company-logo-img-up-sinill' : '',
                        company.id === 'store_8' ? 'company-logo-img-up-etoday' : '',
                        company.id === 'store_9' ? 'company-logo-img-up-ck' : '',
                        company.id === 'store_10' ? 'company-logo-img-up-goodai' : ''

                      ]"
                    />
                  </div>

                  <div class="sc-info">
                    <div class="sc-name">{{ company.name }}</div>
                    <div class="company-desc">{{ company.description }}</div>
                  </div>

                  <span :class="['status-pill', company.status === 'active' ? 'status-active' : 'status-pending']">
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                      <circle cx="3" cy="3" r="3" />
                    </svg>
                    {{ company.status === 'active' ? '운영중' : '설정중' }}
                  </span>
                </div>

                <button class="sc-cta company-btn" @click.stop="openAnalysis(company)">
                  {{ company.name }} {{ company.id === 'store_6' ? '매장 분석하기' : '기업 분석하기' }}
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          <!-- 매장 섹션 -->
          <section class="page-section">
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
