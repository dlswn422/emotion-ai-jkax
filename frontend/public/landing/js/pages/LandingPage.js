const { defineComponent } = Vue;
const { useRouter } = VueRouter;

import { NavBar } from '../components/NavBar.js';
import { buildSparklinePath } from '../utils/charts.js';
import {
  getAuthStatus,
  getGoogleBusinessStatus,
  goGoogleBusinessConnect
} from '../api/auth.js';

export const LandingPage = defineComponent({
  name: 'LandingPage',
  components: { NavBar },
setup() {
  const router = useRouter();

  const sparkData = [3.8, 4.1, 3.5, 4.3, 4.0, 4.5, 4.2, 4.6, 2.8, 3.5, 4.1, 4.4, 4.3];
  const sparkPath = buildSparklinePath(sparkData, 220, 56);
  const sparkArea = sparkPath + ` L ${220},${56} L 0,${56} Z`;

  const showConnectModal = Vue.ref(false);
  const overlay = Vue.ref('none');


  
  async function handleGoogleReviewClick() {
    try {
      const auth = await getAuthStatus();

      if (!auth.logged_in) {
        window.location.href = '/login';
        return;
      }

      const google = await getGoogleBusinessStatus();

      if (!google.connected) {
        showConnectModal.value = true;
        return;
      }

      overlay.value = 'stores';
      setTimeout(() => {
        router.push('/stores');
      }, 600);
    } catch (e) {
      console.error(e);
      window.location.href = '/login';
    }
  }

    async function handleUploadClick() {
      try {
        const auth = await getAuthStatus();

        if (!auth.logged_in) {
          window.location.href = "/login";
          return;
        }

        overlay.value = "upload";
        setTimeout(() => {
          window.location.href = "/upload";
        }, 400);
      } catch (e) {
        window.location.href = "/login";
      }
    }

  function closeConnectModal() {
    showConnectModal.value = false;
  }

  function handleConnectGoogle() {
    goGoogleBusinessConnect();
  }

  return {
    router,
    sparkPath,
    sparkArea,
    showConnectModal,
    overlay,
    handleGoogleReviewClick,
    handleUploadClick,
    closeConnectModal,
    handleConnectGoogle,
  };
},
  template:  `
  <div class="landing-wrap">
  
      <div v-if="overlay !== 'none'" class="page-overlay">
      <div class="page-overlay-card">
        <div class="page-overlay-spinner"></div>
        <p class="page-overlay-text">
        {{
          overlay === 'stores'
            ? '매장 목록으로 이동 중…'
            : overlay === 'upload'
            ? '업로드 화면으로 이동 중…'
            : '이동 중…'
        }}
      </p>
      </div>
    </div>

    <div v-if="showConnectModal" class="modal-backdrop">
      <div class="connect-modal">
        <h2 class="connect-modal-title">Google 계정 연동 필요</h2>
        <p class="connect-modal-desc">
          Google 리뷰를 분석하려면<br />
          먼저 Google 비즈니스 계정을 연동해야 합니다.
        </p>

        <div class="connect-modal-actions">
          <button class="connect-btn connect-btn-secondary" @click="closeConnectModal">
            취소
          </button>
          <button class="connect-btn connect-btn-primary" @click="handleConnectGoogle">
            연동하기
          </button>
        </div>
      </div>
    </div>

    <NavBar page="landing"/>

    <!-- ── HERO ── -->
    <section class="hero-section">
      <div class="hero-noise"></div>
      <div class="hero-grid-lines"></div>
      <div class="hero-inner">
        <!-- Left -->
        <div class="hero-left">
          <div class="hero-eyebrow">
            <div class="hero-eyebrow-dot">
              <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            AI 기반 고객경험 분석 플랫폼
          </div>
          <h1 class="hero-h1">리뷰 데이터를<br><em>실행 가능한<br>인사이트</em>로</h1>
          <p class="hero-desc">Google 리뷰 및 설문 데이터를 AI가 즉시 분석하여 매장 운영에 바로 적용할 수 있는 전략과 액션 플랜을 제공합니다.</p>
          <div class="hero-cta-row">
            <button class="btn btn-brand btn-lg" @click="handleUploadClick">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
              파일 업로드
            </button>
           <button class="btn btn-ghost btn-lg" @click="handleGoogleReviewClick">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Google 리뷰 분석
            </button>
          </div>
          <div class="hero-trust">
            <div class="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              5분 내 분석 완료
            </div>
            <div class="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              설정 없이 바로 사용
            </div>
            <div class="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              실시간 동기화
            </div>
          </div>
        </div>

        <!-- Right — Dashboard Preview -->
        <div class="hero-right">
          <!-- Floating badge 1 -->
          <div class="hero-float hero-float-1">
            <div class="float-icon float-icon-g">📈</div>
            <div class="float-text">
              <strong>NPS +15 개선</strong>
              <span>예약 시스템 도입 후</span>
            </div>
          </div>
          <!-- Floating badge 2 -->
          <div class="hero-float hero-float-2">
            <div class="float-icon float-icon-b">🤖</div>
            <div class="float-text">
              <strong>AI 인사이트 생성</strong>
              <span>418개 리뷰 분석 완료</span>
            </div>
          </div>

          <div class="hero-dashboard">
            <div class="dash-topbar">
              <div class="dash-dot dash-dot-r"></div>
              <div class="dash-dot dash-dot-y"></div>
              <div class="dash-dot dash-dot-g"></div>
              <span style="font-size:11px;color:var(--n-400);margin-left:8px;font-weight:500">CX Nexus · 예원 한식당</span>
            </div>
            <div class="dash-body">
              <div class="dash-kpi-row">
                <div class="dash-kpi">
                  <div class="dash-kpi-label">Overall Rating</div>
                  <div class="dash-kpi-val val-brand">4.0</div>
                  <div class="dash-kpi-sub sub-up">↑ +0.3 전월비</div>
                </div>
                <div class="dash-kpi">
                  <div class="dash-kpi-label">Positive</div>
                  <div class="dash-kpi-val val-emerald">66.7%</div>
                  <div class="dash-kpi-sub sub-up">↑ +5.2%</div>
                </div>
                <div class="dash-kpi">
                  <div class="dash-kpi-label">NPS Score</div>
                  <div class="dash-kpi-val val-amber">8</div>
                  <div class="dash-kpi-sub" style="color:var(--n-400)">Passives</div>
                </div>
              </div>
              <div class="dash-chart-area">
                <div class="dash-chart-hd">
                  <span class="dash-chart-title">평점 추이 (일별)</span>
                  <span class="dash-chip">최근 3개월</span>
                </div>
                <div class="dash-mini-chart">
                  <svg width="100%" height="60" viewBox="0 0 220 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#6366f1" stop-opacity=".25"/>
                        <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
                      </linearGradient>
                    </defs>
                    <path :d="sparkArea" fill="url(#sparkGrad)"/>
                    <path :d="sparkPath" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="dash-keywords">
                <span class="dash-kw kw-pos">🍽 음식 품질</span>
                <span class="dash-kw kw-pos">✨ 분위기</span>
                <span class="dash-kw kw-neg">⏰ 웨이팅</span>
                <span class="dash-kw kw-pos">💰 가성비</span>
                <span class="dash-kw kw-neu">👥 서비스</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── STAT STRIP ── -->
    <div class="stat-strip">
      <div class="stat-strip-inner">
        <div class="strip-item"><div class="strip-val">500+</div><div class="strip-label">분석된 매장 수</div></div>
        <div class="strip-item"><div class="strip-val">98%</div><div class="strip-label">고객 만족도</div></div>
        <div class="strip-item"><div class="strip-val">5분</div><div class="strip-label">평균 분석 시간</div></div>
        <div class="strip-item"><div class="strip-val">15+</div><div class="strip-label">CX 분석 지표</div></div>
      </div>
    </div>

    <!-- ── BENTO FEATURES ── -->
    <section class="bento-section">
      <div class="section-header-wrap">
        <div class="section-label">FEATURES</div>
        <h2 class="section-h2">왜 CX Nexus인가요?</h2>
        <p class="section-p">복잡한 고객 데이터를 단 5분 만에 실행 가능한 전략으로 변환합니다.</p>
      </div>
      <div class="bento-grid" style="max-width:1320px;margin:0 auto">
        <div class="bento-card span-2">
          <div class="bento-icon-wrap ic-brand">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3 class="bento-h3">AI 자동 분석 — 리뷰 수백 개를 즉시 인사이트로</h3>
          <p class="bento-p">GPT 기반 AI가 수백 개의 리뷰를 실시간 분석하여 감성, 키워드, 만족 요인, 개선점을 자동 도출합니다. 5분 내 전략 보고서 완성.</p>
          <div class="bento-visual">
            <div v-for="(b,i) in [{l:'음식 품질',w:'80%'},{l:'분위기',w:'60%'},{l:'서비스',w:'45%'},{l:'가성비',w:'35%'}]" :key="i" class="bento-bar-row">
              <span class="bento-bar-label">{{b.l}}</span>
              <div class="bento-bar-track"><div class="bento-bar-fill" :style="{width:b.w}"></div></div>
              <span class="bento-bar-pct">{{b.w}}</span>
            </div>
          </div>
        </div>
        <div class="bento-card">
          <div class="bento-icon-wrap ic-emerald">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h3 class="bento-h3">실시간 평점 추이</h3>
          <p class="bento-p">일별·월별 평점 변화를 시각화하고 급변 구간을 자동 감지합니다.</p>
        </div>
        <div class="bento-card">
          <div class="bento-icon-wrap ic-violet">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <h3 class="bento-h3">고객 세그먼트 분석</h3>
          <p class="bento-p">신규·재방문 고객, 객단가, 방문 패턴 분석으로 타겟별 전략 수립.</p>
        </div>
        <div class="bento-card">
          <div class="bento-icon-wrap ic-amber">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 013.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <h3 class="bento-h3">NPS 순추천지수</h3>
          <p class="bento-p">Promoters·Passives·Detractors 분석으로 고객 충성도를 정량화.</p>
        </div>
        <div class="bento-card">
          <div class="bento-icon-wrap ic-sky">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <h3 class="bento-h3">전략적 Action Plan</h3>
          <p class="bento-p">우선순위 자동 부여된 실행 가능한 개선 과제를 즉시 생성합니다.</p>
        </div>
        <div class="bento-card">
          <div class="bento-icon-wrap ic-rose">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3 class="bento-h3">PDF 보고서 출력</h3>
          <p class="bento-p">전문가 수준의 CX 전략 보고서를 원클릭으로 생성·공유하세요.</p>
        </div>
      </div>
    </section>

    <!-- ── PROCESS ── -->
    <section class="process-section">
      <div class="process-inner">
        <div class="section-label" style="color:#818cf8">HOW IT WORKS</div>
        <h2 class="process-h2">3단계로 완성되는 CX 인사이트</h2>
        <p class="process-desc">복잡한 설정 없이 바로 시작하세요</p>
        <div class="process-grid">
          <div class="process-step">
            <div class="step-num-badge">01</div>
            <h4>매장 연결</h4>
            <p>Google Business Profile을 연결하거나 설문 데이터를 업로드하세요.</p>
          </div>
          <div class="process-step">
            <div class="step-num-badge">02</div>
            <h4>기간 선택</h4>
            <p>분석 기간을 선택하면 AI가 자동으로 리뷰 데이터를 수집합니다.</p>
          </div>
          <div class="process-step">
            <div class="step-num-badge">03</div>
            <h4>AI 분석</h4>
            <p>수백 개의 리뷰를 AI가 즉시 분석하여 핵심 인사이트를 추출합니다.</p>
          </div>
          <div class="process-step">
            <div class="step-num-badge">04</div>
            <h4>전략 보고서</h4>
            <p>Executive Summary부터 Action Plan까지 완성된 보고서를 확인하세요.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PRICING ── -->
    <section class="pricing-section">
      <div class="section-header-wrap" style="margin-bottom:0">
        <div class="section-label">PRICING</div>
        <h2 class="section-h2">합리적인 가격 정책</h2>
        <p class="section-p">매장 규모에 맞는 플랜을 선택하세요</p>
      </div>
      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pricing-tier">Starter</div>
          <div class="pricing-price"><sup>₩</sup>49,000<sub>/월</sub></div>
          <div class="pricing-sub">소규모 매장을 위한 필수 분석</div>
          <div class="pricing-divider"></div>
          <ul class="pricing-features">
            <li v-for="f in ['매장 1개','월 200개 리뷰 분석','기본 CX 보고서','월 1회 PDF 출력']" :key="f">
              <div class="fi">
                <svg width="7" height="7" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              {{f}}
            </li>
          </ul>
          <button class="btn btn-ghost w-full" style="justify-content:center" @click="router.push('/stores')">시작하기</button>
        </div>
        <div class="pricing-card featured">
          <div class="pricing-featured-badge">✦ 가장 인기</div>
          <div class="pricing-tier">Professional</div>
          <div class="pricing-price"><sup>₩</sup>129,000<sub>/월</sub></div>
          <div class="pricing-sub">성장하는 비즈니스를 위한 완전한 분석</div>
          <div class="pricing-divider"></div>
          <ul class="pricing-features">
            <li v-for="f in ['매장 5개','무제한 리뷰 분석','AI 전략 인사이트','무제한 PDF 출력','Action Plan 자동 생성']" :key="f">
              <div class="fi">
                <svg width="7" height="7" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              {{f}}
            </li>
          </ul>
          <button class="btn btn-brand w-full" style="justify-content:center" @click="router.push('/stores')">시작하기</button>
        </div>
        <div class="pricing-card">
          <div class="pricing-tier">Enterprise</div>
          <div class="pricing-price" style="font-size:30px;letter-spacing:-1px">문의</div>
          <div class="pricing-sub">대규모 프랜차이즈 맞춤 솔루션</div>
          <div class="pricing-divider"></div>
          <ul class="pricing-features">
            <li v-for="f in ['무제한 매장','API 연동 지원','전담 CX 컨설턴트','커스텀 대시보드']" :key="f">
              <div class="fi">
                <svg width="7" height="7" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              {{f}}
            </li>
          </ul>
          <a class="btn btn-ghost w-full" href="mailto:contact@jkax.co.kr" style="justify-content:center">문의하기</a>
        </div>
      </div>
    </section>

    <!-- ── FOOTER ── -->
    <footer class="cx-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div>
            <div class="nav-logo" style="margin-bottom:12px">
              <div class="nav-logo-mark">CX</div>
              <div>
                <div class="nav-logo-text">CXNexus</div>
              </div>
            </div>
            <p class="footer-brand-desc">AI 기반 고객경험(CX) 분석 플랫폼. 리뷰 데이터를 실행 가능한 인사이트로 전환합니다.</p>
            <a href="mailto:contact@jkax.co.kr" class="footer-brand-email">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              contact@jkax.co.kr
            </a>
          </div>
          <div>
            <div class="footer-col-h">서비스</div>
            <ul class="footer-col-list">
              <li><a href="#">Google 리뷰 분석</a></li>
              <li><a href="#">설문 데이터 분석</a></li>
              <li><a href="#">CX 보고서</a></li>
              <li><a href="#">Action Plan</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-col-h">회사</div>
            <ul class="footer-col-list">
              <li><a href="#">(주)JKAX 소개</a></li>
              <li><a href="#">채용</a></li>
              <li><a href="#">블로그</a></li>
              <li><a href="mailto:contact@jkax.co.kr">문의하기</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-col-h">지원</div>
            <ul class="footer-col-list">
              <li><a href="#">이용 가이드</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">개인정보처리방침</a></li>
              <li><a href="#">이용약관</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 (주)JKAX. All rights reserved.</p>
          <div style="display:flex;gap:16px">
            <a href="#">개인정보처리방침</a>
            <a href="#">이용약관</a>
            <a href="mailto:contact@jkax.co.kr" style="color:var(--accent-cyan)">contact@jkax.co.kr</a>
          </div>
        </div>
      </div>
    </footer>
  </div>`
});