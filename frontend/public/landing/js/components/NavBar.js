const { defineComponent } = Vue;
const { useRouter } = VueRouter;

import { ALERT_STORE } from '../B2B/shared.js';

export const NavBar = defineComponent({
  name: 'NavBar',
  props: { page: { type: String, default: '' } },

  setup(props) {
    const router = useRouter();
    const alertStore = ALERT_STORE;

    return { router, props, alertStore };
  },

  template: `
  <nav class="cx-nav">
    <div class="nav-inner">
      <div class="nav-logo" @click="router.push('/')">
        <div class="nav-logo-mark">CX</div>
        <div>
          <div class="nav-logo-text">CXNexus</div>
          <div class="nav-logo-sub">by JKAX</div>
        </div>
      </div>

      <div class="nav-actions">
        <button
          v-if="page !== 'landing'"
          class="nav-pill nav-pill-outline"
          @click="router.back()"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          뒤로가기
        </button>

        <button
          v-if="page === 'landing'"
          class="nav-pill nav-pill-outline"
          @click="router.push('/stores')"
        >
          매장 리뷰 분석
        </button>

        <button
          v-if="page === 'landing'"
          class="nav-pill"
          style="background:linear-gradient(135deg,#312e81,#4338ca);color:#fff;border:none"
          @click="router.push('/mindmap')"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <circle cx="12" cy="11" r="3"/>
          </svg>
          민심지도
        </button>

        <button
          v-if="page === 'landing'"
          class="nav-pill nav-pill-b2b"
          @click="router.push('/B2B')"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          B2B 대시보드
        </button>

        <button
          v-if="page === 'b2b' || page === 'b2b-report' || page === 'admin'"
          class="nav-pill nav-pill-admin"
          @click="router.push('/admin')"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Admin
        </button>

        <button
          class="nav-alert-btn"
          @click="alertStore.showPanel = true"
          title="경영진 Alert"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span v-if="alertStore.unread > 0" class="nav-alert-badge">
            {{ alertStore.unread > 9 ? '9+' : alertStore.unread }}
          </span>
        </button>

        <button class="nav-pill" style="color:var(--text-3)">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          로그아웃
        </button>
      </div>
    </div>
  </nav>
  `,
});