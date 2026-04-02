const { reactive } = Vue;

/* ============================================================
   B2B SHARED STATE / DATA
   원본 app.js의 B2B 전역 의존성만 분리
   ============================================================ */

/* ── Severity config ── */
export const ALERT_SEVERITY = {
  critical: {
    label: '긴급',
    color: '#f43f5e',
    bg: '#fff1f2',
    border: '#fda4af',
    icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  warning: {
    label: '주의',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  info: {
    label: '정보',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

/* ── Alert keyword rules ── */
const ALERT_KEYWORD_RULES = [
  { keywords: ['불량','결함','리콜','소송','공정위','집단민원','영업정지','식약처','부품 수급 지연'], severity: 'critical' },
  { keywords: ['CS 대응','소통 부재','낮은 급여','대기 시간','불만','납기','수직적','온보딩 복잡','보고서 기능 부족','글로벌 통화 제한','가격 정책 불투명','수직적 문화','성장 기회 부족'], severity: 'warning' },
  { keywords: [], severity: 'info' },
];

function getKeywordSeverity(keyword) {
  for (const rule of ALERT_KEYWORD_RULES) {
    if (rule.keywords.some(k => keyword.includes(k) || k.includes(keyword))) {
      return rule.severity;
    }
  }
  return 'warning';
}

/* ── Helpers ── */
export function fmtDate(d) {
  return d ? String(d).replace(/-/g, '.') : '';
}

export function starsStr(n) {
  const safe = Number(n || 0);
  return '★'.repeat(safe) + '☆'.repeat(Math.max(0, 5 - safe));
}

/* 차트 destroy helper */
export function destroyChart(inst) {
  try {
    if (inst && typeof inst.destroy === 'function') inst.destroy();
  } catch (e) {
    console.error(e);
  }
}

/* ============================================================
   GLOBAL STORES
   ============================================================ */
const _savedAlerts = (() => {
  try {
    return JSON.parse(localStorage.getItem('cx_alerts') || '[]');
  } catch {
    return [];
  }
})();

export const ALERT_STORE =
  window.ALERT_STORE ||
  reactive({
    alerts: _savedAlerts,
    showPanel: false,
    showSendModal: false,
    pendingAlert: null,

    get unread() {
      return this.alerts.filter(a => !a.read).length;
    },

    add(alert) {
      const id = 'ALT-' + Date.now();
      const newAlert = {
        id,
        ...alert,
        read: false,
        createdAt: new Date().toISOString(),
        sentAt: null,
        sentTo: [],
      };
      this.alerts.unshift(newAlert);
      this._save();
      return id;
    },

    markRead(id) {
      const a = this.alerts.find(a => a.id === id);
      if (a) {
        a.read = true;
        this._save();
      }
    },

    markAllRead() {
      this.alerts.forEach(a => (a.read = true));
      this._save();
    },

    markSent(id, recipients) {
      const a = this.alerts.find(a => a.id === id);
      if (a) {
        a.sentAt = new Date().toISOString();
        a.sentTo = recipients;
        a.read = true;
        this._save();
      }
    },

    remove(id) {
      this.alerts = this.alerts.filter(a => a.id !== id);
      this._save();
    },

    _save() {
      try {
        localStorage.setItem('cx_alerts', JSON.stringify(this.alerts.slice(0, 100)));
      } catch {}
    },
  });

window.ALERT_STORE = ALERT_STORE;

export const GLOBAL_TAB_STATUSES =
  window.GLOBAL_TAB_STATUSES ||
  reactive({
    shinilpharm: {
      external: 'ready',
      ownreview: 'wip',
      competitive: 'ready',
      internal: 'ready',
      customer: 'ready',
    },
    comp_1: {
      external: 'ready',
      ownreview: 'ready',
      competitive: 'ready',
      internal: 'ready',
      customer: 'ready',
    },
    comp_2: {
      external: 'ready',
      ownreview: 'disabled',
      competitive: 'ready',
      internal: 'disabled',
      customer: 'disabled',
    },
  });

window.GLOBAL_TAB_STATUSES = GLOBAL_TAB_STATUSES;

export function setGlobalTabStatus(compId, tabId, status) {
  if (!GLOBAL_TAB_STATUSES[compId]) GLOBAL_TAB_STATUSES[compId] = {};
  GLOBAL_TAB_STATUSES[compId][tabId] = status;
}

export function syncAdminCustomers(customers) {
  window.GLOBAL_ADMIN_CUSTOMERS = customers || [];
}

export const DB_STORE =
  window.DB_STORE ||
  reactive({
    competitors: [],
    customers: [],
    tabStatuses: {},
    dataSources: [],
    signalKeywords: [],
    prospects: [],
    compIssueSources: [],
    compIssueKeywords: [],
    _loaded: false,
    _loading: false,

    async loadCompetitors() {},
    async loadCustomers() {},
    async loadTabStatuses() {},
    async loadDataSources() {},
    async loadSignalKeywords() {},
    async loadProspects() {},
    async loadCompIssueSources() {},
    async loadCompIssueKeywords() {},

    async addCompetitor() {},
    async updateCompetitor() {},
    async deleteCompetitor() {},

    async addCustomer() {},
    async updateCustomer() {},
    async deleteCustomer() {},

    async addDataSource() {},
    async updateDataSource() {},
    async deleteDataSource() {},

    async addSignalKeyword() {},
    async updateSignalKeyword() {},
    async deleteSignalKeyword() {},

    async addProspect() {},
    async updateProspect() {},
    async deleteProspect() {},

    async addCompIssueSource() {},
    async updateCompIssueSource() {},
    async deleteCompIssueSource() {},

    async addCompIssueKeyword() {},
    async updateCompIssueKeyword() {},
    async deleteCompIssueKeyword() {},

    async setTabStatus(compId, tabId, status) {
      if (!this.tabStatuses[compId]) this.tabStatuses[compId] = {};
      this.tabStatuses[compId][tabId] = { status, _id: `${compId}_${tabId}` };
      setGlobalTabStatus(compId, tabId, status);
    },

    getTabStatus(compId, tabId) {
      return (this.tabStatuses[compId] || {})[tabId]?.status || 'ready';
    },

    async loadAll(force = false) {
      if (this._loading) return;
      if (this._loaded && !force) return;

      this._loading = true;
      try {
        await Promise.all([
          this.loadCompetitors(),
          this.loadCustomers(),
          this.loadTabStatuses(),
          this.loadDataSources(),
          this.loadSignalKeywords(),
          this.loadProspects(),
          this.loadCompIssueSources(),
          this.loadCompIssueKeywords(),
        ]);
      } finally {
        this._loading = false;
        this._loaded = true;
      }

      syncAdminCustomers(this.customers);
    },

    async reload() {
      this._loaded = false;
      this._loading = false;
      await this.loadAll();
    },

    getCompetitors(compId) {
      return this.competitors.filter(c => c.comp_id === compId);
    },

    getCustomers(compId) {
      return this.customers.filter(c => c.comp_id === compId);
    },

    getDataSources(compId) {
      return this.dataSources.filter(d => d.comp_id === compId);
    },

    getSignalKeywords(compId) {
      return this.signalKeywords.filter(k => k.comp_id === compId);
    },

    getProspects(compId) {
      return this.prospects.filter(p => p.comp_id === compId);
    },

    getCompIssueSources(compId) {
      return this.compIssueSources.filter(s => s.comp_id === compId);
    },

    getCompIssueKeywords(compId) {
      return this.compIssueKeywords.filter(k => k.comp_id === compId);
    },
  });

window.DB_STORE = DB_STORE;

/* ============================================================
   B2B COMPANY LIST
   ============================================================ */
  export const B2B_COMPANIES = [
    {
      id: 'shinilpharm',
      tenant_id: 1,
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
        customer: 'ready',
      },
    },
    {
      id: 'comp_1',
      tenant_id: 2,
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
        customer: 'ready',
      },
    },
    {
      id: 'comp_2',
      tenant_id: 3,
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
        customer: 'disabled',
      },
    },
  ];
/* ============================================================
   B2B REPORT DATA
   최소 3개 회사 기준 원본 app.js와 같은 키 구조 유지
   ============================================================ */
export const B2B_REPORTS = {
  shinilpharm: {
    period: { start: '2025-12-09', end: '2026-03-09' },
    external: {
      available: true,
      summary: {
        reputationScore: 68,
        trendDelta: +4,
        keyIssue: '제약/바이알 수요 증가 기대',
        exposure: '보통',
      },
      monthlyTrend: [
        { d: '12월', score: 61 },
        { d: '1월', score: 63 },
        { d: '2월', score: 66 },
        { d: '3월', score: 68 },
      ],
      dailyTrend: [
        { d: '12/09', score: 60 },
        { d: '12/20', score: 61 },
        { d: '01/05', score: 63 },
        { d: '01/28', score: 64 },
        { d: '02/14', score: 66 },
        { d: '03/09', score: 68 },
      ],
      topKeywords: {
        positive: [{ t: '바이알', s: 'xl' }, { t: '제약 수요', s: 'lg' }, { t: '생산 확대', s: 'lg' }],
        negative: [{ t: '부품 수급 지연', s: 'lg' }, { t: '납기', s: 'sm' }],
      },
      issueSources: [
        { source: '뉴스', title: '제약사 생산 확대에 따른 용기 수요 증가 전망', impact: 'high' },
        { source: '커뮤니티', title: '납기 관련 문의 증가', impact: 'medium' },
      ],
    },
    ownReview: {
      available: false,
      reason: '자사 리뷰 채널이 아직 연결되지 않았습니다.',
    },
    competitive: {
      available: true,
      rankingMode: 'rank',
      competitors: [
        { name: '신일팜글래스(주)', score: 68, googleRating: 3.8, sentiment: 61, nps: 22, color: '#6366f1', isMe: true },
        { name: 'A사', score: 64, googleRating: 4.0, sentiment: 57, nps: 18, color: '#10b981' },
        { name: 'B사', score: 59, googleRating: 3.7, sentiment: 52, nps: 11, color: '#f59e0b' },
      ],
      issueKeywords: [
        { keyword: '가격 정책 불투명', signal_level: 'high', hit_count: 14, opportunity: '가격 투명성 강조 세일즈 포인트' },
        { keyword: '납기', signal_level: 'medium', hit_count: 7, opportunity: '공급 안정성 홍보' },
      ],
      monthlyScores: [
        { d: '12월', me: 61, avg: 58 },
        { d: '1월', me: 63, avg: 59 },
        { d: '2월', me: 66, avg: 60 },
        { d: '3월', me: 68, avg: 61 },
      ],
      dailyScores: [
        { d: '12/09', me: 60, avg: 57 },
        { d: '01/05', me: 63, avg: 58 },
        { d: '02/14', me: 66, avg: 60 },
        { d: '03/09', me: 68, avg: 61 },
      ],
    },
    internal: {
      available: true,
      overallScore: 64,
      monthlyTrend: [
        { d: '12월', score: 61 },
        { d: '1월', score: 62 },
        { d: '2월', score: 63 },
        { d: '3월', score: 64 },
      ],
      jobplanetDetail: {
        workLifeBalance: 3.1,
        salary: 2.8,
        culture: 3.0,
        advancement: 2.9,
        management: 3.0,
        topPros: ['안정적 업력', '제조 전문성', '책임감 있는 조직'],
        topCons: ['낮은 급여', '성장 기회 부족', '보고 체계 경직'],
      },
    },
    customerAnalysis: {
      available: false,
      reason: 'CRM 데이터 연동이 아직 완료되지 않았습니다.',
      recommendations: [
        { title: 'CRM API 연결', desc: 'Salesforce / HubSpot API를 연결해 고객 데이터를 자동 수집합니다' },
        { title: 'CSV 업로드', desc: '고객 데이터를 CSV 형식으로 일괄 업로드합니다' },
      ],
    },
  },

  comp_1: {
    period: { start: '2025-12-09', end: '2026-03-09' },
    external: {
      available: true,
      summary: {
        reputationScore: 82,
        trendDelta: +6,
        keyIssue: '전기차/현지 생산 확대',
        exposure: '높음',
      },
      monthlyTrend: [
        { d: '12월', score: 73 },
        { d: '1월', score: 76 },
        { d: '2월', score: 79 },
        { d: '3월', score: 82 },
      ],
      dailyTrend: [
        { d: '12/09', score: 72 },
        { d: '01/05', score: 75 },
        { d: '02/14', score: 79 },
        { d: '03/09', score: 82 },
      ],
      topKeywords: {
        positive: [{ t: 'EV', s: 'xl' }, { t: '현지 생산', s: 'lg' }, { t: '딜러십', s: 'lg' }],
        negative: [{ t: 'CS 대응', s: 'sm' }],
      },
      issueSources: [
        { source: '뉴스', title: '현지 생산 확대 투자 발표', impact: 'high' },
        { source: '커뮤니티', title: '서비스센터 대기 관련 글 증가', impact: 'medium' },
      ],
    },
    ownReview: {
      available: true,
      overallRating: 4.3,
      reviewCount: 2840,
      sentiment: { positive: 71, neutral: 20, negative: 9 },
      topPositives: ['디자인', '브랜드 신뢰', '연비'],
      topNegatives: ['서비스센터', '대기시간'],
      negKeywords: ['대기 시간', 'CS 대응'],
      ratingDist: [
        { stars: 5, count: 1440 },
        { stars: 4, count: 760 },
        { stars: 3, count: 350 },
        { stars: 2, count: 180 },
        { stars: 1, count: 110 },
      ],
      dailyRatings: [
        { d: '12/09', r: 4.1 },
        { d: '01/05', r: 4.2 },
        { d: '02/14', r: 4.3 },
        { d: '03/09', r: 4.3 },
      ],
      monthlyRatings: [
        { d: '12월', r: 4.1 },
        { d: '1월', r: 4.2 },
        { d: '2월', r: 4.3 },
        { d: '3월', r: 4.3 },
      ],
    },
    competitive: {
      available: true,
      rankingMode: 'rank',
      competitors: [
        { name: 'Hyundai Motors Indonesia', score: 82, googleRating: 4.3, sentiment: 71, nps: 41, color: '#6366f1', isMe: true },
        { name: 'Toyota Indonesia', score: 79, googleRating: 4.5, sentiment: 68, nps: 37, color: '#10b981' },
        { name: 'Wuling Motors', score: 74, googleRating: 4.1, sentiment: 62, nps: 28, color: '#f59e0b' },
      ],
      issueKeywords: [
        { keyword: '서비스센터 대기', signal_level: 'high', hit_count: 21, opportunity: 'AS 응대 개선 메시지 필요' },
        { keyword: '가격 정책', signal_level: 'medium', hit_count: 11, opportunity: '프로모션 전략 수립' },
      ],
      monthlyScores: [
        { d: '12월', me: 73, avg: 70 },
        { d: '1월', me: 76, avg: 72 },
        { d: '2월', me: 79, avg: 74 },
        { d: '3월', me: 82, avg: 76 },
      ],
      dailyScores: [
        { d: '12/09', me: 72, avg: 69 },
        { d: '01/05', me: 75, avg: 71 },
        { d: '02/14', me: 79, avg: 74 },
        { d: '03/09', me: 82, avg: 76 },
      ],
    },
    internal: {
      available: true,
      overallScore: 78,
      monthlyTrend: [
        { d: '12월', score: 74 },
        { d: '1월', score: 75 },
        { d: '2월', score: 77 },
        { d: '3월', score: 78 },
      ],
      jobplanetDetail: {
        workLifeBalance: 3.8,
        salary: 3.9,
        culture: 3.7,
        advancement: 3.8,
        management: 3.6,
        topPros: ['브랜드 파워', '복지', '글로벌 경험', '안정성'],
        topCons: ['대기업 문화', '의사결정 속도', '조직 복잡성'],
      },
    },
    customerAnalysis: {
      available: true,
      summary: {
        totalCustomers: { current: 198, previous: 183, delta_pct: 8.2 },
        atRiskCustomers: { current: 24, previous: 29, delta_pct: -17.2 },
        avgSatisfaction: { current: 4.2, previous: 4.0, delta_pct: 5.0 },
        repeatVisitRate: { current: 71, previous: 66, delta_pct: 7.6 },
      },
      riskDistribution: { HIGH: 24, MEDIUM: 58, LOW: 116 },
      visitFrequencyDistribution: {
        weekly_plus: 28,
        monthly_2: 24,
        monthly_1: 21,
        occasional: 17,
        first_visit: 10,
      },
      cohort: {
        rows: [
          { cohort: '2025-11', size: 18, m1: 61, m2: 44, m3: 33, m4: 22, m5: 17 },
          { cohort: '2025-12', size: 24, m1: 58, m2: 39, m3: 31, m4: 20, m5: null },
          { cohort: '2026-01', size: 31, m1: 64, m2: 48, m3: 36, m4: null, m5: null },
        ],
        summary_text: '현대 인도네시아 고객 코호트는 1개월차 재방문율이 58~64% 수준으로 안정적입니다.',
      },
      list: [
        { id: 1, name: 'Ahmad Rizky', rating: 5, churnPct: 8, risk: 'LOW', visitFreq: '월 2회', avgSpend: 'Rp 2.4jt', lastActivity: '2026-03-07', sentiment: 'positive', tags: ['전시장 만족','재방문 의사'] },
        { id: 2, name: 'Dian Lestari', rating: 3, churnPct: 48, risk: 'MEDIUM', visitFreq: '가끔', avgSpend: 'Rp 1.9jt', lastActivity: '2026-02-26', sentiment: 'neutral', tags: ['상담 대기','비교 검토'] },
        { id: 3, name: 'Budi Santoso', rating: 2, churnPct: 81, risk: 'HIGH', visitFreq: '첫 방문', avgSpend: 'Rp 1.2jt', lastActivity: '2026-01-30', sentiment: 'negative', tags: ['서비스센터 불만','대기시간'] },
      ],
    },
  },

  comp_2: {
    period: { start: '2025-12-09', end: '2026-03-09' },
    external: {
      available: true,
      summary: {
        reputationScore: 64,
        trendDelta: +1,
        keyIssue: '핀테크 파트너십 확대',
        exposure: '보통',
      },
      monthlyTrend: [
        { d: '12월', score: 62 },
        { d: '1월', score: 63 },
        { d: '2월', score: 63 },
        { d: '3월', score: 64 },
      ],
      dailyTrend: [
        { d: '12/09', score: 61 },
        { d: '01/05', score: 62 },
        { d: '02/14', score: 63 },
        { d: '03/09', score: 64 },
      ],
      topKeywords: {
        positive: [{ t: '결제 SaaS', s: 'lg' }, { t: '동남아 확장', s: 'lg' }, { t: '파트너십', s: 'sm' }],
        negative: [{ t: '보고서 기능 부족', s: 'lg' }, { t: '온보딩 복잡', s: 'sm' }],
      },
      issueSources: [
        { source: '뉴스', title: '동남아 시장 확장 파트너십 체결', impact: 'medium' },
        { source: '커뮤니티', title: '리포트 기능 부족 피드백 증가', impact: 'medium' },
      ],
    },
    ownReview: {
      available: false,
      reason: '자사 공개 리뷰 채널이 아직 확보되지 않았습니다.',
    },
    competitive: {
      available: true,
      rankingMode: 'rank',
      competitors: [
        { name: 'BrightFin Fintech', score: 64, googleRating: 4.1, sentiment: 59, nps: 24, color: '#6366f1', isMe: true },
        { name: 'PayHub SEA', score: 66, googleRating: 4.2, sentiment: 61, nps: 27, color: '#10b981' },
        { name: 'NovaPayments', score: 60, googleRating: 3.9, sentiment: 54, nps: 18, color: '#f59e0b' },
      ],
      issueKeywords: [
        { keyword: '온보딩 복잡', signal_level: 'high', hit_count: 13, opportunity: '도입 단순화 메시지 필요' },
        { keyword: '보고서 기능 부족', signal_level: 'medium', hit_count: 9, opportunity: '리포팅 강점 차별화' },
      ],
      monthlyScores: [
        { d: '12월', me: 62, avg: 61 },
        { d: '1월', me: 63, avg: 62 },
        { d: '2월', me: 63, avg: 62 },
        { d: '3월', me: 64, avg: 63 },
      ],
      dailyScores: [
        { d: '12/09', me: 61, avg: 60 },
        { d: '01/05', me: 62, avg: 61 },
        { d: '02/14', me: 63, avg: 62 },
        { d: '03/09', me: 64, avg: 63 },
      ],
    },
    internal: {
      available: true,
      overallScore: 64,
      monthlyTrend: [
        { d: '12월', score: 62 },
        { d: '1월', score: 63 },
        { d: '2월', score: 63 },
        { d: '3월', score: 64 },
      ],
      jobplanetDetail: {
        workLifeBalance: 3.4,
        salary: 2.9,
        culture: 3.2,
        advancement: 3.0,
        management: 3.1,
        topPros: ['글로벌 성장 가능성', '빠른 의사결정', '스타트업 문화', '다양한 국적 팀'],
        topCons: ['온보딩 복잡', '보고서 기능 부족', '보상 불만족', '글로벌 통화 제한'],
      },
    },
    customerAnalysis: {
      available: false,
      reason: 'BrightFin CRM 데이터 API 연동이 아직 완료되지 않았습니다.',
      recommendations: [
        { title: 'CRM API 연결', desc: 'Salesforce / HubSpot API를 연결해 고객 데이터를 자동 수집합니다' },
        { title: 'CSV 업로드', desc: '고객 데이터를 CSV 형식으로 일괄 업로드합니다' },
      ],
    },
  },
};

/* ============================================================
   ALERT HELPERS
   ============================================================ */
export function detectAndCreateAlerts(report, companyName, compId) {
  const sources = [
    { src: report?.external?.topKeywords?.negative ?? [], tab: 'external', tabLabel: '고객 동향' },
    { src: report?.ownReview?.negKeywords ?? [],          tab: 'ownreview', tabLabel: '리뷰 감정' },
  ];

  sources.forEach(({ src, tab, tabLabel }) => {
    src.forEach((kw) => {
      const keyword = kw.t ?? kw;
      const severity = getKeywordSeverity(keyword);
      const dupKey = `${compId}_${keyword}`;
      const existing = ALERT_STORE.alerts.find((a) => a.dupKey === dupKey);
      const dayAgo = Date.now() - 86400000;

      if (existing && new Date(existing.createdAt).getTime() > dayAgo) return;

      ALERT_STORE.add({
        dupKey,
        compId,
        companyName,
        tab,
        tabLabel,
        keyword,
        severity,
        title: `부정 키워드 감지: "${keyword}"`,
        desc: `[${companyName}] ${tabLabel} 분석에서 부정 키워드 "${keyword}"가 감지되었습니다. 경영진 검토 및 대응 조치가 필요합니다.`,
      });
    });
  });
}