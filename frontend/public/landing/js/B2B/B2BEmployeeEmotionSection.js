const { defineComponent, computed } = Vue;

import { B2B_EMPLOYEE_EMOTION_MOCK } from './B2BEmployeeEmotionMock.js';

export const B2BEmployeeEmotionSection = defineComponent({
  name: 'B2BEmployeeEmotionSection',

  props: {
    compId: { type: String, required: true },
    analysisPeriod: { type: Object, required: false, default: () => ({}) },
  },

  setup(props) {
    const report = computed(
      () =>
        B2B_EMPLOYEE_EMOTION_MOCK[props.compId] ||
        B2B_EMPLOYEE_EMOTION_MOCK.shinilpharm
    );

    const avgScore = computed(() => {
      const d = report.value?.jobplanetDetail;
      if (!d) return 0;
      return (
        (Number(d.workLifeBalance || 0) +
          Number(d.salary || 0) +
          Number(d.culture || 0) +
          Number(d.advancement || 0) +
          Number(d.management || 0)) / 5
      );
    });

    const detailCards = computed(() => {
      const d = report.value.jobplanetDetail || {};
      return [
        { label: '워라밸', score: Number(d.workLifeBalance || 0) },
        { label: '급여·복지', score: Number(d.salary || 0) },
        { label: '사내문화', score: Number(d.culture || 0) },
        { label: '성장기회', score: Number(d.advancement || 0) },
        { label: '경영진', score: Number(d.management || 0) },
      ];
    });

    function scoreColor(val) {
      if (val >= 4) return '#10b981';
      if (val >= 3) return '#f59e0b';
      return '#f43f5e';
    }

    function starsFillCount(val) {
      return Math.round(Number(val || 0));
    }

    return {
      report,
      avgScore,
      detailCards,
      scoreColor,
      starsFillCount,
    };
  },

  template: `
  <div>
    <template v-if="report && report.available">

      <!-- ① 종합 평점 헤더 카드 -->
      <div class="jp-summary-card">
        <div class="jp-summary-left">
          <div class="jp-logo-badge">잡플래닛</div>
          <div class="jp-summary-title">직원 평가 종합</div>
          <div class="jp-summary-sub">{{ report.period.start }} ~ {{ report.period.end }} 기준</div>
        </div>

        <div class="jp-summary-score-wrap">
          <div class="jp-summary-score" :style="{ color: scoreColor(avgScore) }">
            {{ avgScore.toFixed(1) }}
          </div>
          <div class="jp-summary-denom">/ 5.0</div>
          <div class="jp-summary-stars">
            <span
              v-for="i in 5"
              :key="'sum-star-' + i"
              :style="{ color: i <= starsFillCount(avgScore) ? '#ff6b35' : '#d7dee8', fontSize: '18px' }"
            >★</span>
          </div>
        </div>

        <div class="jp-summary-bars">
          <div v-for="item in detailCards" :key="item.label" class="jp-mini-bar-row">
            <div class="jp-mini-lbl">{{ item.label }}</div>
            <div class="jp-mini-track">
              <div
                class="jp-mini-fill"
                :style="{ width: ((item.score / 5) * 100) + '%', background: scoreColor(item.score) }"
              ></div>
            </div>
            <div class="jp-mini-val" :style="{ color: scoreColor(item.score) }">{{ item.score.toFixed(1) }}</div>
          </div>
        </div>
      </div>

      <!-- ② 세부 평가 -->
      <div class="r-card" style="margin-bottom:20px">
        <div class="r-card-hd">
          <div class="r-card-title">
            <div class="r-title-icon" style="background:#fff7ed;color:#f97316">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 20V10M18 20V4M6 20v-6"/>
              </svg>
            </div>
            카테고리별 세부 평가
          </div>
          <span class="chip chip-neutral" style="background:#fff1f2;color:#ff6b35;border-color:#fed7aa">잡플래닛</span>
        </div>

        <div class="r-card-body">
          <div class="jp-detail-grid">
            <div v-for="item in detailCards" :key="item.label" class="jp-detail-card">
              <div class="jp-cat-name">{{ item.label }}</div>
              <div class="jp-cat-score" :style="{ color: scoreColor(item.score) }">{{ item.score.toFixed(1) }}</div>

              <div class="jp-cat-stars">
                <span
                  v-for="i in 5"
                  :key="item.label + '-star-' + i"
                  :style="{ color: i <= starsFillCount(item.score) ? '#ff6b35' : '#d7dee8', fontSize: '15px' }"
                >★</span>
              </div>

              <div class="jp-cat-bar-wrap">
                <div
                  class="jp-cat-bar"
                  :style="{ width: ((item.score / 5) * 100) + '%', background: scoreColor(item.score) }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ③ 장점 / 단점 -->
      <div class="r-card" style="margin-bottom:20px">
        <div class="r-card-hd">
          <div class="r-card-title">
            <div class="r-title-icon ic-emerald">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/>
              </svg>
            </div>
            직원의견—장점 · 단점
          </div>
        </div>

        <div class="r-card-body">
          <div class="jp-pros-cons">
            <div class="jp-pros">
              <div class="jp-pc-label">
                <svg width="13" height="13" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                직원들이 꼽은 장점
              </div>
              <div class="jp-tags">
                <span v-for="tag in report.jobplanetDetail.topPros || []" :key="'pro-' + tag" class="jp-tag jp-tag-pro">
                  {{ tag }}
                </span>
              </div>
            </div>

            <div class="jp-cons">
              <div class="jp-pc-label">
                <svg width="13" height="13" fill="none" stroke="#f43f5e" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M15 9l-6 6m0-6l6 6m6 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                직원들이 꼽은 단점
              </div>
              <div class="jp-tags">
                <span v-for="tag in report.jobplanetDetail.topCons || []" :key="'con-' + tag" class="jp-tag jp-tag-con">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ④ 핵심 이슈 (잡플래닛 기반) -->
      <div class="r-card">
        <div class="r-card-hd">
          <div class="r-card-title">
            <div class="r-title-icon ic-rose">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            잡플래닛 기반 핵심 이슈
          </div>
        </div>

        <div class="r-card-body" style="padding:16px">
          <div class="b2b-issues">
            <div
              v-for="iss in report.keyIssues || []"
              :key="iss.text"
              :class="['b2b-issue-row', 'issue-' + iss.severity]"
            >
              <div class="b2b-issue-dot"></div>
              <div class="b2b-issue-text">{{ iss.text }}</div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <template v-else>
      <div class="tab-status-screen disabled" style="margin-top:18px">
        <div class="tab-screen-badge disabled">데이터 미연동</div>
        <h2 class="tab-screen-title">잡플래닛 데이터가 연동되지 않았습니다</h2>
        <p class="tab-screen-desc">잡플래닛 데이터를 연동하면 직원 감정 분석이 시작됩니다.</p>
      </div>
    </template>
  </div>
  `,
});