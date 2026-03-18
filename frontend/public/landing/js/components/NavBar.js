const { defineComponent } = Vue;
const { useRouter } = VueRouter;



export const NavBar = defineComponent({
  name: 'NavBar',
  props: { page: { type: String, default: '' } },
  setup(props) {
    const router = useRouter();

    async function handleLogout() {
      try {
        await logout();
      } catch (e) {
        console.error(e);
      } finally {
        router.push('/');
      }
    }

    return { router, props, handleLogout };
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
        <button v-if="page !== 'landing'" class="nav-pill nav-pill-outline"
          @click="router.back()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          뒤로가기
        </button>
        <button v-if="page === 'landing'" class="nav-pill nav-pill-outline"
          @click="router.push('/stores')">
          대시보드
        </button>
        <button class="nav-pill" style="color:var(--text-3)">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          로그아웃
        </button>
      </div>
    </div>
  </nav>`
});