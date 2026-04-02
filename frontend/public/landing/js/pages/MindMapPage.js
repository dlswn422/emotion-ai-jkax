const { defineComponent, ref, computed } = Vue;
const { useRouter } = VueRouter;

import {
  SONGPA_DONGS,
  DONG_PATHS,
  MM_GU_STATS,
  mmScoreToColor,
  mmScoreToLabel,
  mmScoreToBg,
  mmScoreToTextColor,
} from '../data/mindmapMock.js';

const MindMapPage = defineComponent({
  name: 'MindMapPage',
  setup() {
    const router = useRouter();
    const selectedDong = ref(null);
    const hoveredDong  = ref(null);
    const filterScore  = ref('all');
    const filterCat    = ref('all');
    const searchQ      = ref('');
    const panelOpen    = ref(false);
    const viewMode     = ref('map');
    const kwFilter     = ref('');

    const categories = computed(()=>{
      const s = new Set(SONGPA_DONGS.map(d=>d.category));
      return ['전체',...s];
    });

    const filteredDongs = computed(()=>{
      let list = SONGPA_DONGS;
      if (filterScore.value==='high') list=list.filter(d=>d.score>=75);
      if (filterScore.value==='mid')  list=list.filter(d=>d.score>=55&&d.score<75);
      if (filterScore.value==='low')  list=list.filter(d=>d.score<55);
      if (filterCat.value!=='all'&&filterCat.value!=='전체') list=list.filter(d=>d.category===filterCat.value);
      if (searchQ.value.trim()) list=list.filter(d=>d.name.includes(searchQ.value)||d.keywords.some(k=>k.includes(searchQ.value)));
      return list;
    });

    const filteredIds = computed(()=>new Set(filteredDongs.value.map(d=>d.id)));

    function selectDong(dong){ selectedDong.value=dong; panelOpen.value=true; }
    function closePanel(){ panelOpen.value=false; setTimeout(()=>{ selectedDong.value=null; },300); }

    const displayKws = computed(()=>{
      const q=kwFilter.value.trim().toLowerCase();
      return q ? MM_GU_STATS.topKws.filter(k=>k.kw.includes(q)) : MM_GU_STATS.topKws;
    });

    const rankList = computed(()=>[...filteredDongs.value].sort((a,b)=>b.score-a.score));
    const issueList= computed(()=>[...SONGPA_DONGS].sort((a,b)=>a.score-b.score).slice(0,5));

    return {
      selectedDong, hoveredDong, filterScore, filterCat,
      searchQ, panelOpen, viewMode, kwFilter,
      categories, filteredDongs, filteredIds, rankList, issueList, displayKws,
      selectDong, closePanel,
      SONGPA_DONGS, DONG_PATHS, GU_STATS: MM_GU_STATS,
      scoreToColor: mmScoreToColor, scoreToLabel: mmScoreToLabel,
      scoreToBg: mmScoreToBg, scoreToTextColor: mmScoreToTextColor,
      router,
    };
  },
  template: `
<div class="mm-root">

  <header class="mm-header">
    <div class="mm-header-inner">
      <div class="mm-logo" @click="router.push('/')">
        <div class="mm-logo-mark">CX</div>
        <div>
          <div class="mm-logo-text">CXNexus</div>
          <div class="mm-logo-sub">고객 민심지도</div>
        </div>
      </div>
      <div class="mm-header-title">
        <div class="mm-gu-badge">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
          서울특별시 송파구
        </div>
        <h1 class="mm-page-title">동별 민심지도</h1>
        <span class="mm-update-badge">2026.03 기준</span>
      </div>
      <div class="mm-header-actions">
        <button class="mm-hbtn" @click="router.push('/')">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          홈
        </button>
      </div>
    </div>
  </header>

  <div class="mm-kpi-strip">
    <div class="mm-kpi-card mm-kpi-score">
      <div class="mm-kpi-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      </div>
      <div>
        <div class="mm-kpi-lbl">구 평균 민심지수</div>
        <div class="mm-kpi-val" style="color:#6366f1">{{GU_STATS.avg}}<span class="mm-kpi-unit">점</span></div>
        <div class="mm-kpi-sub">{{GU_STATS.avgTrend > 0 ? '▲' : '▼'}} {{Math.abs(GU_STATS.avgTrend)}}p 전월 대비</div>
      </div>
    </div>
    <div class="mm-kpi-card mm-kpi-posts">
      <div class="mm-kpi-icon" style="background:linear-gradient(135deg,#0ea5e9,#38bdf8)">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      </div>
      <div>
        <div class="mm-kpi-lbl">총 수집 게시물</div>
        <div class="mm-kpi-val" style="color:#0ea5e9">{{GU_STATS.totalPosts.toLocaleString()}}<span class="mm-kpi-unit">건</span></div>
        <div class="mm-kpi-sub">SNS·커뮤니티·민원 통합</div>
      </div>
    </div>
    <div class="mm-kpi-card mm-kpi-high">
      <div class="mm-kpi-icon" style="background:linear-gradient(135deg,#10b981,#34d399)">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
      </div>
      <div>
        <div class="mm-kpi-lbl">긍정 우세 동</div>
        <div class="mm-kpi-val" style="color:#10b981">{{GU_STATS.highDongs}}<span class="mm-kpi-unit">개</span></div>
        <div class="mm-kpi-sub">민심지수 80점 이상</div>
      </div>
    </div>
    <div class="mm-kpi-card mm-kpi-low">
      <div class="mm-kpi-icon" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
      </div>
      <div>
        <div class="mm-kpi-lbl">관리 필요 동</div>
        <div class="mm-kpi-val" style="color:#f43f5e">{{GU_STATS.lowDongs}}<span class="mm-kpi-unit">개</span></div>
        <div class="mm-kpi-sub">민심지수 60점 미만</div>
      </div>
    </div>
    <div class="mm-kpi-card mm-kpi-kw">
      <div class="mm-kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
      </div>
      <div>
        <div class="mm-kpi-lbl">감지 키워드 수</div>
        <div class="mm-kpi-val" style="color:#f59e0b">{{GU_STATS.topKws.length}}<span class="mm-kpi-unit">개</span></div>
        <div class="mm-kpi-sub">구 전체 상위 키워드</div>
      </div>
    </div>
  </div>

  <div class="mm-body">
    <div class="mm-left">
      <div class="mm-filter-bar">
        <div class="mm-search-wrap">
          <svg class="mm-search-ico" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="searchQ" class="mm-search-input" placeholder="동 이름 또는 키워드 검색..."/>
        </div>
        <div class="mm-filter-group">
          <button :class="['mm-fbtn', filterScore==='all'?'active':'']" @click="filterScore='all'">전체</button>
          <button :class="['mm-fbtn mm-fbtn-high', filterScore==='high'?'active':'']" @click="filterScore='high'">긍정</button>
          <button :class="['mm-fbtn mm-fbtn-mid', filterScore==='mid'?'active':'']" @click="filterScore='mid'">보통</button>
          <button :class="['mm-fbtn mm-fbtn-low', filterScore==='low'?'active':'']" @click="filterScore='low'">부정</button>
        </div>
        <div class="mm-view-toggle">
          <button :class="['mm-vtbtn', viewMode==='map'?'active':'']" @click="viewMode='map'">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 16l4.553 2.276A1 1 0 0021 24.382V8.618a1 1 0 00-.553-.894L15 5m0 18V5m0 0L9 7"/></svg>
            지도
          </button>
          <button :class="['mm-vtbtn', viewMode==='list'?'active':'']" @click="viewMode='list'">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            목록
          </button>
        </div>
      </div>

      <div v-if="viewMode==='map'" class="mm-map-wrap">
        <div class="mm-map-legend">
          <span class="mm-leg-item"><span class="mm-leg-dot" style="background:#10b981"></span>매우긍정 (80+)</span>
          <span class="mm-leg-item"><span class="mm-leg-dot" style="background:#34d399"></span>긍정 (70-79)</span>
          <span class="mm-leg-item"><span class="mm-leg-dot" style="background:#fbbf24"></span>보통 (60-69)</span>
          <span class="mm-leg-item"><span class="mm-leg-dot" style="background:#fb923c"></span>부정우려 (50-59)</span>
          <span class="mm-leg-item"><span class="mm-leg-dot" style="background:#ef4444"></span>부정 (~49)</span>
        </div>
        <div class="mm-svg-container">
          <svg viewBox="0 0 640 480" class="mm-svg" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
            <rect width="640" height="480" fill="#eef2f7" rx="12"/>
            <path d="M 0,155 Q 80,118 180,142 Q 280,128 380,132 Q 480,118 600,138 L 640,130 L 640,0 L 0,0 Z" fill="#bfdbfe" opacity="0.55" pointer-events="none"/>
            <text x="80" y="95" font-size="13" fill="#2563eb" font-family="sans-serif" font-weight="700" opacity="0.75" pointer-events="none">한   강</text>

            <g pointer-events="none">
              <g v-for="dong in SONGPA_DONGS" :key="'fill-'+dong.id">
                <path
                  :d="DONG_PATHS[dong.id]?.d || ''"
                  :fill="filteredIds.has(dong.id) ? scoreToColor(dong.score) : 'rgba(200,210,220,0.35)'"
                  :stroke="selectedDong?.id===dong.id ? '#1e293b' : hoveredDong?.id===dong.id ? '#334155' : '#fff'"
                  :stroke-width="selectedDong?.id===dong.id ? 2.5 : hoveredDong?.id===dong.id ? 2 : 1.2"
                  :opacity="filteredIds.has(dong.id) ? 1 : 0.4"
                />
              </g>
            </g>

            <g pointer-events="none">
              <g v-for="dong in SONGPA_DONGS" :key="'label-'+dong.id">
                <text v-if="filteredIds.has(dong.id)"
                  :x="DONG_PATHS[dong.id]?.cx || 0"
                  :y="(DONG_PATHS[dong.id]?.cy || 0) - 6"
                  text-anchor="middle" font-size="9.5" font-weight="700" fill="#1e293b"
                  font-family="'Noto Sans KR',sans-serif"
                  style="text-shadow:0 1px 2px rgba(255,255,255,.8)"
                >{{dong.name}}</text>
                <text v-if="filteredIds.has(dong.id)"
                  :x="DONG_PATHS[dong.id]?.cx || 0"
                  :y="(DONG_PATHS[dong.id]?.cy || 0) + 7"
                  text-anchor="middle" font-size="10" font-weight="900"
                  :fill="dong.score>=70?'#065f46':dong.score>=60?'#92400e':'#991b1b'"
                  font-family="sans-serif"
                >{{dong.score}}</text>
              </g>
            </g>

            <g>
              <path v-for="dong in SONGPA_DONGS" :key="'hit-'+dong.id"
                :d="DONG_PATHS[dong.id]?.d || ''"
                fill="transparent"
                stroke="none"
                style="cursor:pointer"
                @click="selectDong(dong)"
                @mouseenter="hoveredDong=dong"
                @mouseleave="hoveredDong=null"
              />
            </g>

            <g v-if="hoveredDong && !selectedDong" pointer-events="none">
              <rect
                :x="Math.min((DONG_PATHS[hoveredDong.id]?.cx||300)+10, 478)"
                :y="(DONG_PATHS[hoveredDong.id]?.cy||200)-30"
                width="155" height="62" rx="8"
                fill="white" stroke="#e2e8f0" stroke-width="1" filter="url(#mmShadow)"
              />
              <text
                :x="Math.min((DONG_PATHS[hoveredDong.id]?.cx||300)+18, 486)"
                :y="(DONG_PATHS[hoveredDong.id]?.cy||200)-10"
                font-size="12" font-weight="800" fill="#1e293b" font-family="sans-serif"
              >{{hoveredDong.name}}</text>
              <text
                :x="Math.min((DONG_PATHS[hoveredDong.id]?.cx||300)+18, 486)"
                :y="(DONG_PATHS[hoveredDong.id]?.cy||200)+8"
                font-size="11" fill="#64748b" font-family="sans-serif"
              >민심지수: {{hoveredDong.score}}점 · {{scoreToLabel(hoveredDong.score)}}</text>
              <text
                :x="Math.min((DONG_PATHS[hoveredDong.id]?.cx||300)+18, 486)"
                :y="(DONG_PATHS[hoveredDong.id]?.cy||200)+24"
                font-size="10" fill="#94a3b8" font-family="sans-serif"
              >게시물 {{hoveredDong.posts.toLocaleString()}}건</text>
            </g>

            <defs>
              <filter id="mmShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,.12)"/>
              </filter>
            </defs>
          </svg>
        </div>
        <div class="mm-issue-strip">
          <div class="mm-issue-title">
            <svg width="13" height="13" fill="none" stroke="#f43f5e" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            즉시 모니터링 필요
          </div>
          <div class="mm-issue-list">
            <div v-for="d in issueList" :key="d.id" class="mm-issue-chip" @click="selectDong(d)">
              <span class="mm-issue-name">{{d.name}}</span>
              <span class="mm-issue-score" :style="{color:scoreToTextColor(d.score)}">{{d.score}}점</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mm-list-wrap">
        <div class="mm-list-header">
          <span class="mm-lh-col mm-lh-rank">#</span>
          <span class="mm-lh-col mm-lh-name">동 이름</span>
          <span class="mm-lh-col mm-lh-score">민심지수</span>
          <span class="mm-lh-col mm-lh-trend">추이</span>
          <span class="mm-lh-col mm-lh-posts">게시물</span>
          <span class="mm-lh-col mm-lh-cat">분류</span>
          <span class="mm-lh-col mm-lh-issue">주요 이슈</span>
        </div>
        <div v-for="(dong, idx) in rankList" :key="dong.id" class="mm-list-row" @click="selectDong(dong)">
          <div class="mm-lh-col mm-lh-rank">
            <span class="mm-rank-num" :class="idx===0?'gold':idx===1?'silver':idx===2?'bronze':''">{{idx+1}}</span>
          </div>
          <div class="mm-lh-col mm-lh-name">
            <span class="mm-dong-dot" :style="{background:scoreToColor(dong.score,1)}"></span>
            <span class="mm-dong-name-txt">{{dong.name}}</span>
          </div>
          <div class="mm-lh-col mm-lh-score">
            <div class="mm-score-wrap">
              <span class="mm-score-num" :style="{color:scoreToTextColor(dong.score)}">{{dong.score}}</span>
              <div class="mm-score-bar-bg"><div class="mm-score-bar-fill" :style="{width:dong.score+'%',background:scoreToColor(dong.score,1)}"></div></div>
            </div>
          </div>
          <div class="mm-lh-col mm-lh-trend">
            <span :style="{color:dong.trend>=0?'#10b981':'#f43f5e',fontWeight:700,fontSize:'12px'}">
              {{dong.trend>=0?'▲':'▼'}}{{Math.abs(dong.trend)}}
            </span>
          </div>
          <div class="mm-lh-col mm-lh-posts">{{dong.posts.toLocaleString()}}</div>
          <div class="mm-lh-col mm-lh-cat"><span class="mm-cat-tag">{{dong.category}}</span></div>
          <div class="mm-lh-col mm-lh-issue"><span class="mm-issue-txt">{{dong.topIssue}}</span></div>
        </div>
      </div>
    </div>

    <div class="mm-right">
      <transition name="mm-panel">
        <div v-if="selectedDong" class="mm-detail-panel">
          <div class="mm-dp-header" :style="{background: scoreToBg(selectedDong.score)}">
            <div class="mm-dp-hd-top">
              <div>
                <div class="mm-dp-dong-name">{{selectedDong.name}}</div>
                <div class="mm-dp-cat-tag">{{selectedDong.category}}</div>
              </div>
              <div class="mm-dp-score-circle" :style="{background:scoreToColor(selectedDong.score),color:'#fff'}">
                <span class="mm-dp-score-num">{{selectedDong.score}}</span>
                <span class="mm-dp-score-lbl">점</span>
              </div>
            </div>
            <div class="mm-dp-sentiment-label" :style="{color:scoreToTextColor(selectedDong.score)}">
              {{scoreToLabel(selectedDong.score)}} 민심
            </div>
            <button class="mm-dp-close" @click="closePanel">✕</button>
          </div>

          <div class="mm-dp-section">
            <div class="mm-dp-sec-title">감정 분포</div>
            <div class="mm-sentiment-bar">
              <div class="mm-sent-seg mm-sent-pos" :style="{width:selectedDong.sentiment.pos+'%'}">{{selectedDong.sentiment.pos}}%</div>
              <div class="mm-sent-seg mm-sent-neu" :style="{width:selectedDong.sentiment.neu+'%'}">{{selectedDong.sentiment.neu}}%</div>
              <div class="mm-sent-seg mm-sent-neg" :style="{width:selectedDong.sentiment.neg+'%'}">{{selectedDong.sentiment.neg}}%</div>
            </div>
            <div class="mm-sent-legend">
              <span><span class="mm-sent-dot mm-sent-dot-pos"></span>긍정 {{selectedDong.sentiment.pos}}%</span>
              <span><span class="mm-sent-dot mm-sent-dot-neu"></span>중립 {{selectedDong.sentiment.neu}}%</span>
              <span><span class="mm-sent-dot mm-sent-dot-neg"></span>부정 {{selectedDong.sentiment.neg}}%</span>
            </div>
          </div>

          <div class="mm-dp-section">
            <div class="mm-dp-stat-row">
              <div class="mm-dp-stat">
                <div class="mm-dp-stat-lbl">수집 게시물</div>
                <div class="mm-dp-stat-val">{{selectedDong.posts.toLocaleString()}}<span style="font-size:11px;color:#64748b"> 건</span></div>
              </div>
              <div class="mm-dp-stat">
                <div class="mm-dp-stat-lbl">전월 대비</div>
                <div class="mm-dp-stat-val" :style="{color:selectedDong.trend>=0?'#10b981':'#f43f5e'}">
                  {{selectedDong.trend>=0?'▲':'▼'}} {{Math.abs(selectedDong.trend)}}p
                </div>
              </div>
            </div>
          </div>

          <div class="mm-dp-section">
            <div class="mm-dp-sec-title">감지 키워드</div>
            <div class="mm-kw-chips">
              <span v-for="(kw, i) in selectedDong.keywords" :key="kw"
                    class="mm-kw-chip"
                    :style="{
                      background: i<2 ? scoreToBg(selectedDong.score) : '#f1f5f9',
                      color: i<2 ? scoreToTextColor(selectedDong.score) : '#475569',
                      borderColor: i<2 ? scoreToColor(selectedDong.score,0.4) : '#cbd5e1',
                      fontWeight: i<2 ? '800' : '600'
                    }">
                {{i<2?'🔥':''}} {{kw}}
              </span>
            </div>
          </div>

          <div class="mm-dp-section">
            <div class="mm-dp-sec-title">주요 이슈</div>
            <div class="mm-issue-card">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:2px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              {{selectedDong.topIssue}}
            </div>
            <div class="mm-signal-card">
              <svg width="13" height="13" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:2px"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {{selectedDong.recentSignal}}
            </div>
          </div>
        </div>
      </transition>

      <div v-if="!selectedDong" class="mm-default-panel">
        <div class="mm-dp-hint">
          <svg width="36" height="36" fill="none" stroke="var(--brand-300)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
          <p>지도에서 동을 클릭하거나<br/>목록에서 항목을 선택하세요</p>
        </div>
        <div class="mm-rank-preview">
          <div class="mm-rp-title">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            민심지수 TOP 5
          </div>
          <div v-for="(d,i) in [...SONGPA_DONGS].sort((a,b)=>b.score-a.score).slice(0,5)" :key="d.id" class="mm-rp-row" @click="selectDong(d)">
            <span class="mm-rp-rank">{{i+1}}</span>
            <span class="mm-rp-name">{{d.name}}</span>
            <div class="mm-rp-bar-wrap">
              <div class="mm-rp-bar" :style="{width:d.score+'%',background:scoreToColor(d.score,1)}"></div>
            </div>
            <span class="mm-rp-score" :style="{color:scoreToTextColor(d.score)}">{{d.score}}</span>
          </div>
        </div>
      </div>

      <div class="mm-kw-panel">
        <div class="mm-kw-panel-hd">
          <div class="mm-dp-sec-title" style="margin:0">구 전체 감지 키워드</div>
          <div class="mm-kw-search-wrap">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="kwFilter" class="mm-kw-search-input" placeholder="키워드 검색"/>
          </div>
        </div>
        <div class="mm-kw-cloud">
          <span v-for="kw in displayKws" :key="kw.kw"
                class="mm-cloud-chip"
                :style="{
                  fontSize: (10 + kw.cnt * 1.5) + 'px',
                  opacity: 0.6 + kw.cnt * 0.08,
                  background: kw.cnt >= 4 ? '#eef2ff' : kw.cnt >= 2 ? '#f0fdf4' : '#f8fafc',
                  color: kw.cnt >= 4 ? '#4f46e5' : kw.cnt >= 2 ? '#047857' : '#475569',
                  borderColor: kw.cnt >= 4 ? '#c7d2fe' : kw.cnt >= 2 ? '#a7f3d0' : '#e2e8f0',
                  fontWeight: kw.cnt >= 4 ? '800' : kw.cnt >= 2 ? '700' : '600',
                }">
            {{kw.kw}}
            <span class="mm-cloud-cnt">{{kw.cnt}}</span>
          </span>
          <div v-if="displayKws.length===0" style="padding:16px;color:#94a3b8;font-size:13px">검색 결과 없음</div>
        </div>
      </div>
    </div>
  </div>

  <footer class="mm-footer">
    <div class="mm-footer-inner">
      <span>CXNexus 고객 민심지도 · 서울 송파구 · 2026.03 기준</span>
      <span>SNS · 온라인 커뮤니티 · 민원 데이터 통합 분석</span>
    </div>
  </footer>

</div>`
});

export { MindMapPage };