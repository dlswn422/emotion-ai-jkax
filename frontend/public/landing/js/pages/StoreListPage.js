const { defineComponent, ref, computed } = Vue;
const { useRouter } = VueRouter;

import { STORES } from '../data/stores.js';
import { NavBar } from '../components/NavBar.js';
import { DateModal } from '../components/DateModal.js';

export const StoreListPage = defineComponent({
  name: 'StoreListPage',
  components: { NavBar, DateModal },
  setup() {
    const router = useRouter();
    const searchQ = ref('');
    const showModal = ref(false);
    const selectedStore = ref(null);

    const filtered = computed(() =>
      STORES.filter(s =>
        s.name.toLowerCase().includes(searchQ.value.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQ.value.toLowerCase())
      )
    );

    function openAnalysis(store) {
      selectedStore.value = store;
      showModal.value = true;
    }

    function onConfirm(dates) {
      if (selectedStore.value) {
        router.push({ path: `/report/${selectedStore.value.id}`, query: dates });
      }
    }

    return { searchQ, filtered, showModal, selectedStore, openAnalysis, onConfirm };
  },
  template: `
  <div>
    <NavBar page="stores"/>
    <div class="page-shell">
      <div class="page-body">
        <div class="alert-bar">
          <div class="alert-bar-icon">⚠️</div>
          <span>Google API 승인 전 단계입니다. 현재 화면은 <strong>데모 데이터</strong> 기반으로 표시됩니다.</span>
        </div>
        <div class="page-hero-bar">
          <div>
            <h1 class="page-h1">내 매장 리뷰 분석</h1>
            <p class="page-sub">Google 리뷰 기반 고객 인사이트 · 총 {{filtered.length}}개 매장</p>
          </div>
          <button class="btn btn-brand" @click="openAnalysis(filtered[0])">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            최신 리뷰 동기화
          </button>
        </div>
        <div class="toolbar">
          <div class="search-field">
            <svg class="si" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQ" placeholder="매장 이름 또는 주소 검색..."/>
          </div>
        </div>
        <div class="store-grid">
          <div v-for="store in filtered" :key="store.id"
            class="store-card" @click="openAnalysis(store)">
            <div class="sc-header">
              <div class="sc-avatar">🏪</div>
              <div class="sc-info">
                <div class="sc-name">{{store.name}}</div>
                <div class="sc-addr">{{store.address}}</div>
              </div>
              <span :class="['status-pill', store.status==='active'?'status-active':'status-pending']">
                <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                  <circle cx="3" cy="3" r="3"/>
                </svg>
                {{store.status==='active'?'운영중':'설정중'}}
              </span>
            </div>
            <div class="sc-metrics">
              <div class="sc-rating">
                <span class="sc-star">★</span>
                <span class="sc-rating-num">{{store.rating}}</span>
              </div>
              <div class="sc-divider"></div>
              <div class="sc-count">리뷰 <strong>{{store.reviewCount.toLocaleString()}}개</strong></div>
              <div class="sc-divider"></div>
              <div class="sc-count">{{store.country}}</div>
            </div>
            <button class="sc-cta" @click.stop="openAnalysis(store)">
              이 매장 리뷰 분석하기
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
            <h3>새 매장 추가하기</h3>
            <p>Google Business Profile 연결</p>
          </div>
        </div>
      </div>
    </div>
    <DateModal v-model="showModal" @confirm="onConfirm"/>
  </div>`
});