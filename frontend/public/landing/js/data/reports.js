// export const REPORTS = {
//   store_1: {
//     storeId: 'store_1',
//     period: { start: '2025-12-09', end: '2026-03-09' },
//     execSummary: '고객들은 전반적으로 긍정적인 경험을 보고하고 있으며, 특히 음식의 품질과 분위기에 만족하고 있습니다. 최근 3개월간 평균 평점 4.0점을 기록하며 안정적인 고객 만족도를 유지하고 있습니다. 그러나 주말 피크타임의 웨이팅 시간에 대한 불만 의견이 지속적으로 접수되고 있어 운영 프로세스 개선이 시급합니다. 음식 품질과 매장 분위기를 강점으로 삼아 재방문율을 높이는 전략이 효과적일 것으로 분석됩니다.',
//     pillars: [
//       { type: 'strength', label: '주요 강점', val: '음식 품질 · 분위기' },
//       { type: 'improve',  label: '개선 필요', val: '웨이팅 시간 관리' },
//       { type: 'opport',   label: '기회 요인', val: '커플·데이트 마케팅' }
//     ],
//     overallRating: 4.0,
//     ratingPct: 80,
//     ratingDist: [
//       { stars: 5, count: 42 }, { stars: 4, count: 28 },
//       { stars: 3, count: 18 }, { stars: 2, count: 8 }, { stars: 1, count: 4 }
//     ],
//     sentiment: { positive: 66.7, neutral: 33.3, negative: 0 },
//     nps: { score: 8, promoters: 45, passives: 40, detractors: 15 },
//     segments: [
//       { label: '신규 고객', val: '38%', trend: 'up', delta: '+5%' },
//       { label: '재방문 고객', val: '62%', trend: 'up', delta: '+3%' },
//       { label: '평균 객단가', val: '₩42,000', trend: 'up', delta: '+8%' },
//       { label: '재방문 의향', val: '78%', trend: 'up', delta: '+2%' }
//     ],
//     dailyRatings: [
//       {d:'12/09',r:4.2},{d:'12/10',r:4.5},{d:'12/11',r:3.8},{d:'12/12',r:4.1},{d:'12/13',r:3.5},
//       {d:'12/14',r:4.3},{d:'12/15',r:4.0},{d:'12/16',r:4.4},{d:'12/17',r:2.8},{d:'12/18',r:3.2},
//       {d:'12/19',r:4.1},{d:'12/20',r:4.5},{d:'12/21',r:4.3},{d:'12/22',r:4.6},{d:'12/23',r:4.0}
//     ],
//     monthlyRatings: [
//       {d:'2025.12',r:3.9},{d:'2026.01',r:4.1},{d:'2026.02',r:4.2},{d:'2026.03',r:4.0}
//     ],
//     drivers: [
//       { name: '음식 품질', pct: 50, emoji: '🍽️' },
//       { name: '분위기 & 인테리어', pct: 30, emoji: '✨' },
//       { name: '가성비', pct: 20, emoji: '💰' }
//     ],
//     improvements: [
//       { name: '웨이팅 타임 관리', desc: '주말 피크타임 대기 30분 초과 불만 지속 접수', emoji: '⏰', badge: '긴급', badgeClass: 'ib-urgent' },
//       { name: '직원 서비스 일관성', desc: '직원별 서비스 품질 편차가 고객 경험에 영향', emoji: '👥', badge: '중요', badgeClass: 'ib-important' }
//     ],
//     insights: [
//       { emoji:'🔥', title:'음식 품질이 고객 만족의 핵심 동인', desc:'고객 리뷰 50%에서 음식 품질이 언급되며 재방문 의사와 강한 양의 상관관계를 보입니다. 시즌 메뉴 강화 및 식재료 프리미엄화 전략을 고려하세요.' },
//       { emoji:'💑', title:'분위기가 데이트 장소로서의 핵심 경쟁력', desc:'"분위기", "데이트", "특별한 날" 언급 빈도가 높아 커플 마케팅에 높은 잠재력을 보입니다. 인스타그램 포토존 강화를 권장합니다.' },
//       { emoji:'⚡', title:'웨이팅이 재방문율 저해의 핵심 원인', desc:'대기시간 불만 리뷰는 평점 2.8점으로 급락 패턴을 보입니다. 예약 시스템 도입 시 NPS 15점 이상 개선 가능성이 있습니다.' },
//       { emoji:'📈', title:'주말 수요 집중 패턴 확인', desc:'금~일 리뷰 수가 주중 대비 3.2배 높으며 평점은 0.4점 낮습니다. 피크타임 운영 인력 최적화가 핵심 과제입니다.' }
//     ],
//     actions: [
//       { priority:'high', label:'H', cls:'ad-high', title:'예약 시스템 도입', desc:'네이버 예약 또는 자체 예약 시스템 도입으로 웨이팅 불만 근본 해결.', tags:['즉시 실행','운영'], deadline:'2주 이내' },
//       { priority:'high', label:'H', cls:'ad-high', title:'피크타임 추가 인력 배치', desc:'금~일 18:00~21:00 추가 서버 1~2명 배치로 서비스 속도 향상.', tags:['즉시 실행','인력'], deadline:'1주 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'커플 패키지 메뉴 런칭', desc:'프리미엄 코스 메뉴 출시로 분위기 만족도 활용 및 객단가 향상.', tags:['메뉴개발','마케팅'], deadline:'1개월 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'인스타그램 포토존 설치', desc:'SNS 바이럴 마케팅을 위한 포토존 1~2곳 설치 추진.', tags:['마케팅','공간'], deadline:'1개월 이내' },
//       { priority:'low', label:'L', cls:'ad-low', title:'직원 서비스 교육 프로그램', desc:'월 1회 정기 교육으로 서비스 편차 최소화 및 일관된 고객 경험 제공.', tags:['교육','장기'], deadline:'3개월 이내' }
//     ],
//     keywords: {
//       positive: [{t:'맛있어요',s:'xl'},{t:'분위기 굿',s:'lg'},{t:'재방문 확정',s:'xl'},{t:'친절한 서비스',s:'lg'},{t:'깔끔한 맛',s:'lg'},{t:'데이트 장소 추천',s:'xl'},{t:'가성비 좋음',s:'sm'},{t:'인테리어 예쁨',s:'sm'}],
//       negative: [{t:'웨이팅 길어요',s:'xl'},{t:'주차 불편',s:'lg'},{t:'가격 부담',s:'sm'}]
//     }
//   },

//   store_2: {
//     storeId: 'store_2',
//     period: { start: '2025-12-09', end: '2026-03-09' },
//     execSummary: 'HALLA RESTAURANT HALAL은 할랄 인증 한식을 제공하는 특화 매장으로, 자카르타 무슬림 커뮤니티 내 강력한 충성 고객층을 확보하고 있습니다. 높은 평균 평점(4.7)과 긍정적 감성 비율 75%를 유지하며 안정적 성장세를 보이고 있습니다. 할랄 인증 신뢰도가 핵심 차별화 요인이며, 메뉴 다양성 확충이 성장의 핵심 과제입니다.',
//     pillars: [
//       { type: 'strength', label: '주요 강점', val: '할랄 인증 신뢰도' },
//       { type: 'improve',  label: '개선 필요', val: '메뉴 다양성 부족' },
//       { type: 'opport',   label: '기회 요인', val: '무슬림 커뮤니티 SNS' }
//     ],
//     overallRating: 4.7,
//     ratingPct: 94,
//     ratingDist: [
//       { stars: 5, count: 68 }, { stars: 4, count: 32 },
//       { stars: 3, count: 14 }, { stars: 2, count: 5 }, { stars: 1, count: 2 }
//     ],
//     sentiment: { positive: 75, neutral: 21, negative: 4 },
//     nps: { score: 9, promoters: 60, passives: 28, detractors: 12 },
//     segments: [
//       { label: '신규 고객', val: '42%', trend: 'up', delta: '+8%' },
//       { label: '재방문 고객', val: '58%', trend: 'up', delta: '+4%' },
//       { label: '평균 객단가', val: '₩38,000', trend: 'up', delta: '+5%' },
//       { label: '재방문 의향', val: '84%', trend: 'up', delta: '+6%' }
//     ],
//     dailyRatings: [
//       {d:'12/09',r:4.5},{d:'12/10',r:4.8},{d:'12/11',r:4.6},{d:'12/12',r:4.7},{d:'12/13',r:4.4},
//       {d:'12/14',r:4.9},{d:'12/15',r:4.7},{d:'12/16',r:4.8},{d:'12/17',r:4.5}
//     ],
//     monthlyRatings: [
//       {d:'2025.12',r:4.5},{d:'2026.01',r:4.6},{d:'2026.02',r:4.8},{d:'2026.03',r:4.7}
//     ],
//     drivers: [
//       { name: '할랄 인증 신뢰도', pct: 45, emoji: '✅' },
//       { name: '음식 신선도', pct: 35, emoji: '🥗' },
//       { name: '친절한 서비스', pct: 20, emoji: '😊' }
//     ],
//     improvements: [
//       { name: '메뉴 다양성 부족', desc: '할랄 메뉴 종류 확대 요청이 지속적으로 접수됨', emoji: '📋', badge: '중요', badgeClass: 'ib-important' }
//     ],
//     insights: [
//       { emoji:'✅', title:'할랄 인증이 핵심 차별화 요소', desc:'할랄 인증 신뢰는 자카르타 무슬림 커뮤니티 내 강력한 입소문 효과를 만들고 있습니다.' },
//       { emoji:'📊', title:'재방문율 업계 최고 수준', desc:'재방문 의향 84%는 동종 업계 평균(62%) 대비 22%p 높은 수준입니다.' }
//     ],
//     actions: [
//       { priority:'high', label:'H', cls:'ad-high', title:'할랄 메뉴 라인업 확대', desc:'갈비탕, 불고기 외 다양한 한식 할랄 메뉴 추가로 신규 고객 유입 확대.', tags:['메뉴','즉시실행'], deadline:'1개월 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'무슬림 커뮤니티 SNS 마케팅', desc:'인스타그램/틱톡 할랄 한식 콘텐츠로 자카르타 무슬림 타겟 인지도 향상.', tags:['마케팅','SNS'], deadline:'2주 이내' }
//     ],
//     keywords: {
//       positive: [{t:'할랄 믿을 수 있어요',s:'xl'},{t:'신선해요',s:'xl'},{t:'친절함',s:'lg'},{t:'재방문 확정',s:'lg'}],
//       negative: [{t:'메뉴가 적어요',s:'xl'},{t:'웨이팅',s:'sm'}]
//     }
//   },

//   store_3: {
//     storeId: 'store_3',
//     period: { start: '2025-12-09', end: '2026-03-09' },
//     execSummary: 'Leechadol 이차돌 세노파티는 매우 높은 평점(4.9)을 유지하며 고객 만족도가 가장 우수한 매장 중 하나로 나타납니다. 특히 고기 품질, 빠른 서빙, 단체 모임에 적합한 분위기가 강점으로 확인됩니다. 전반적인 감성은 매우 긍정적이나, 피크타임 좌석 부족과 환기 관련 언급이 일부 확인되어 운영 최적화가 필요합니다.',
//     pillars: [
//       { type: 'strength', label: '주요 강점', val: '고기 품질 · 빠른 서빙' },
//       { type: 'improve',  label: '개선 필요', val: '피크타임 좌석 운영' },
//       { type: 'opport',   label: '기회 요인', val: '단체 회식·모임 수요' }
//     ],
//     overallRating: 4.9,
//     ratingPct: 98,
//     ratingDist: [
//       { stars: 5, count: 110 }, { stars: 4, count: 24 },
//       { stars: 3, count: 8 }, { stars: 2, count: 3 }, { stars: 1, count: 2 }
//     ],
//     sentiment: { positive: 82, neutral: 14, negative: 4 },
//     nps: { score: 9, promoters: 68, passives: 22, detractors: 10 },
//     segments: [
//       { label: '신규 고객', val: '46%', trend: 'up', delta: '+7%' },
//       { label: '재방문 고객', val: '54%', trend: 'up', delta: '+5%' },
//       { label: '평균 객단가', val: '₩48,000', trend: 'up', delta: '+6%' },
//       { label: '재방문 의향', val: '88%', trend: 'up', delta: '+7%' }
//     ],
//     dailyRatings: [
//       {d:'12/09',r:4.8},{d:'12/10',r:4.9},{d:'12/11',r:4.7},{d:'12/12',r:4.9},{d:'12/13',r:5.0},
//       {d:'12/14',r:4.8},{d:'12/15',r:4.9},{d:'12/16',r:4.8},{d:'12/17',r:4.9},{d:'12/18',r:4.7},
//       {d:'12/19',r:5.0},{d:'12/20',r:4.9}
//     ],
//     monthlyRatings: [
//       {d:'2025.12',r:4.8},{d:'2026.01',r:4.9},{d:'2026.02',r:4.9},{d:'2026.03',r:4.9}
//     ],
//     drivers: [
//       { name: '고기 품질', pct: 44, emoji: '🥩' },
//       { name: '빠른 서빙', pct: 31, emoji: '⚡' },
//       { name: '모임 분위기', pct: 25, emoji: '🍻' }
//     ],
//     improvements: [
//       { name: '피크타임 좌석 부족', desc: '저녁 시간대 단체 고객 유입 시 대기 발생 빈도가 증가함', emoji: '🪑', badge: '중요', badgeClass: 'ib-important' },
//       { name: '매장 환기 체감', desc: '고기 냄새와 연기에 대한 언급이 일부 리뷰에서 확인됨', emoji: '🌬️', badge: '보통', badgeClass: 'ib-normal' }
//     ],
//     insights: [
//       { emoji:'🥩', title:'고기 품질이 압도적 핵심 강점', desc:'리뷰 내 "부드럽다", "신선하다", "맛있다" 언급이 매우 높으며 평점 5점 리뷰와 직접 연결됩니다.' },
//       { emoji:'👥', title:'단체 회식 수요가 성장 동력', desc:'가족 모임, 회식, 친구 모임 관련 키워드가 많이 나타나며 주말 저녁 방문 비중이 높습니다.' },
//       { emoji:'⚠️', title:'대기와 환기 이슈가 낮은 평점의 주요 원인', desc:'부정 리뷰는 대부분 좌석 부족, 연기, 혼잡도와 관련되어 있어 시설·동선 개선 효과가 클 것으로 보입니다.' },
//       { emoji:'📈', title:'높은 평점 대비 운영 개선 여지 존재', desc:'이미 만족도는 높지만, 예약·대기 관리 도입 시 프리미엄 모임 장소 포지셔닝이 더욱 강화될 수 있습니다.' }
//     ],
//     actions: [
//       { priority:'high', label:'H', cls:'ad-high', title:'피크타임 예약/대기 시스템 도입', desc:'저녁 시간대 현장 혼잡 완화를 위해 예약 또는 대기 알림 시스템 적용.', tags:['운영','즉시 실행'], deadline:'2주 이내' },
//       { priority:'high', label:'H', cls:'ad-high', title:'환기 설비 점검 및 안내 강화', desc:'테이블 주변 환기 상태를 개선하고 매장 내 쾌적성 체감을 높임.', tags:['시설','즉시 실행'], deadline:'3주 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'단체 모임 세트 메뉴 운영', desc:'회식/가족 외식용 세트 메뉴를 구성해 객단가와 전환율을 동시 강화.', tags:['메뉴','매출'], deadline:'1개월 이내' },
//       { priority:'low', label:'L', cls:'ad-low', title:'리뷰 유도 캠페인 진행', desc:'만족 고객 대상 리뷰 이벤트로 평판 자산을 지속적으로 축적.', tags:['리뷰','마케팅'], deadline:'1개월 이내' }
//     ],
//     keywords: {
//       positive: [
//         {t:'고기 퀄리티 최고',s:'xl'},{t:'너무 맛있어요',s:'xl'},{t:'서빙 빨라요',s:'lg'},{t:'회식하기 좋아요',s:'lg'},
//         {t:'친절해요',s:'sm'},{t:'재방문 의사 있음',s:'lg'},{t:'가족모임 추천',s:'sm'}
//       ],
//       negative: [
//         {t:'저녁엔 좀 붐빔',s:'lg'},{t:'연기 아쉬움',s:'sm'},{t:'대기 있음',s:'sm'}
//       ]
//     }
//   },

//   store_4: {
//     storeId: 'store_4',
//     period: { start: '2025-12-09', end: '2026-03-09' },
//     execSummary: '청담가든은 대규모 리뷰 수(2,244개)를 기반으로 안정적인 브랜드 신뢰도를 확보한 매장입니다. 전통 한식의 맛, 푸짐한 양, 가족 외식에 적합한 편안한 분위기가 주요 강점으로 나타났습니다. 다만 매장 규모 대비 서비스 속도 편차와 주차 편의성 관련 의견이 일부 확인되어 고객 경험의 일관성 확보가 중요 과제로 분석됩니다.',
//     pillars: [
//       { type: 'strength', label: '주요 강점', val: '전통 한식 · 가족 외식' },
//       { type: 'improve',  label: '개선 필요', val: '서비스 속도 편차' },
//       { type: 'opport',   label: '기회 요인', val: '가족모임·상견례 수요' }
//     ],
//     overallRating: 4.6,
//     ratingPct: 92,
//     ratingDist: [
//       { stars: 5, count: 96 }, { stars: 4, count: 46 },
//       { stars: 3, count: 20 }, { stars: 2, count: 9 }, { stars: 1, count: 5 }
//     ],
//     sentiment: { positive: 73, neutral: 20, negative: 7 },
//     nps: { score: 8, promoters: 57, passives: 27, detractors: 16 },
//     segments: [
//       { label: '신규 고객', val: '34%', trend: 'up', delta: '+4%' },
//       { label: '재방문 고객', val: '66%', trend: 'up', delta: '+5%' },
//       { label: '평균 객단가', val: '₩52,000', trend: 'up', delta: '+6%' },
//       { label: '재방문 의향', val: '81%', trend: 'up', delta: '+4%' }
//     ],
//     dailyRatings: [
//       {d:'12/09',r:4.4},{d:'12/10',r:4.6},{d:'12/11',r:4.5},{d:'12/12',r:4.7},{d:'12/13',r:4.3},
//       {d:'12/14',r:4.6},{d:'12/15',r:4.7},{d:'12/16',r:4.4},{d:'12/17',r:4.5},{d:'12/18',r:4.6},
//       {d:'12/19',r:4.7},{d:'12/20',r:4.5}
//     ],
//     monthlyRatings: [
//       {d:'2025.12',r:4.5},{d:'2026.01',r:4.6},{d:'2026.02',r:4.6},{d:'2026.03',r:4.6}
//     ],
//     drivers: [
//       { name: '전통 한식의 맛', pct: 41, emoji: '🍲' },
//       { name: '푸짐한 양', pct: 34, emoji: '🍚' },
//       { name: '가족 외식 분위기', pct: 25, emoji: '🏡' }
//     ],
//     improvements: [
//       { name: '서비스 속도 편차', desc: '혼잡 시간대 주문/서빙 속도 차이가 고객 경험에 영향', emoji: '🕒', badge: '중요', badgeClass: 'ib-important' },
//       { name: '주차 편의성', desc: '차량 방문 고객 중심으로 주차 불편 언급이 반복됨', emoji: '🅿️', badge: '보통', badgeClass: 'ib-normal' }
//     ],
//     insights: [
//       { emoji:'🍲', title:'전통 한식 이미지가 강한 브랜드 자산', desc:'한식 본연의 맛, 국물 요리, 반찬 구성에 대한 긍정 평가가 매우 높아 브랜드 정체성이 분명합니다.' },
//       { emoji:'👨‍👩‍👧‍👦', title:'가족 외식·모임 수요가 핵심 고객층', desc:'부모님, 가족 식사, 손님 접대 관련 리뷰가 많아 신뢰형 외식 브랜드로 인식되고 있습니다.' },
//       { emoji:'⚖️', title:'만족도는 높지만 운영 일관성이 관건', desc:'평점 하락 리뷰는 대체로 혼잡 시간대 응대 속도 문제에 집중되어 있어 인력 운영 최적화 효과가 큽니다.' },
//       { emoji:'📍', title:'접근성과 주차 경험 개선 여지', desc:'차량 이용 고객이 많은 매장 특성상 주차 안내와 대기 동선 설계가 만족도 상승에 직접 기여할 수 있습니다.' }
//     ],
//     actions: [
//       { priority:'high', label:'H', cls:'ad-high', title:'피크타임 서비스 인력 재배치', desc:'주말 점심·저녁 혼잡 시간대 주문/서빙 병목을 줄이기 위한 인력 운영 조정.', tags:['운영','인력'], deadline:'2주 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'가족모임 패키지 메뉴 강화', desc:'4인/6인 기준 패밀리 세트 구성으로 객단가와 편의성을 동시에 확보.', tags:['메뉴','가족고객'], deadline:'1개월 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'주차 안내 표기 개선', desc:'입구/주차장 동선 안내를 명확히 하여 첫 방문 고객 불편 최소화.', tags:['시설','안내'], deadline:'3주 이내' },
//       { priority:'low', label:'L', cls:'ad-low', title:'상견례·모임 홍보 콘텐츠 제작', desc:'조용하고 정갈한 이미지 중심의 SNS/플레이스 콘텐츠 보강.', tags:['브랜딩','마케팅'], deadline:'1개월 이내' }
//     ],
//     keywords: {
//       positive: [
//         {t:'한식이 정갈해요',s:'xl'},{t:'가족식사 좋아요',s:'xl'},{t:'반찬이 푸짐해요',s:'lg'},{t:'맛이 깔끔해요',s:'lg'},
//         {t:'부모님 모시기 좋아요',s:'lg'},{t:'재방문 예정',s:'sm'}
//       ],
//       negative: [
//         {t:'주차가 조금 불편',s:'lg'},{t:'바쁠 때 응대 느림',s:'lg'},{t:'대기 있음',s:'sm'}
//       ]
//     }
//   },

//   store_5: {
//     storeId: 'store_5',
//     period: { start: '2025-12-09', end: '2026-03-09' },
//     execSummary: '토박은 비교적 높은 리뷰 규모(1,410개)와 안정적인 평점(4.5)을 기반으로 로컬 충성 고객층을 확보한 매장입니다. 전반적으로 음식 맛, 정겨운 분위기, 가성비에 대한 평가가 긍정적이며, 단골 비중이 높은 것이 특징입니다. 반면 일부 리뷰에서는 매장 혼잡도와 좌석 회전 속도에 대한 아쉬움이 나타나 운영 측면의 세부 개선이 필요합니다.',
//     pillars: [
//       { type: 'strength', label: '주요 강점', val: '가성비 · 로컬 단골층' },
//       { type: 'improve',  label: '개선 필요', val: '혼잡도·회전율 관리' },
//       { type: 'opport',   label: '기회 요인', val: '단골 추천 기반 확장' }
//     ],
//     overallRating: 4.5,
//     ratingPct: 90,
//     ratingDist: [
//       { stars: 5, count: 84 }, { stars: 4, count: 44 },
//       { stars: 3, count: 23 }, { stars: 2, count: 10 }, { stars: 1, count: 6 }
//     ],
//     sentiment: { positive: 70, neutral: 22, negative: 8 },
//     nps: { score: 8, promoters: 54, passives: 30, detractors: 16 },
//     segments: [
//       { label: '신규 고객', val: '31%', trend: 'up', delta: '+3%' },
//       { label: '재방문 고객', val: '69%', trend: 'up', delta: '+6%' },
//       { label: '평균 객단가', val: '₩36,000', trend: 'up', delta: '+4%' },
//       { label: '재방문 의향', val: '79%', trend: 'up', delta: '+3%' }
//     ],
//     dailyRatings: [
//       {d:'12/09',r:4.4},{d:'12/10',r:4.5},{d:'12/11',r:4.3},{d:'12/12',r:4.6},{d:'12/13',r:4.2},
//       {d:'12/14',r:4.5},{d:'12/15',r:4.4},{d:'12/16',r:4.6},{d:'12/17',r:4.3},{d:'12/18',r:4.5},
//       {d:'12/19',r:4.6},{d:'12/20',r:4.4}
//     ],
//     monthlyRatings: [
//       {d:'2025.12',r:4.4},{d:'2026.01',r:4.5},{d:'2026.02',r:4.6},{d:'2026.03',r:4.5}
//     ],
//     drivers: [
//       { name: '가성비', pct: 39, emoji: '💰' },
//       { name: '정겨운 분위기', pct: 33, emoji: '😊' },
//       { name: '로컬 단골층 만족', pct: 28, emoji: '🏘️' }
//     ],
//     improvements: [
//       { name: '혼잡 시간대 회전율', desc: '점심·저녁 피크타임에 좌석 회전이 느리다는 의견이 일부 존재', emoji: '🔄', badge: '중요', badgeClass: 'ib-important' },
//       { name: '매장 동선 정리', desc: '혼잡 시 주문/착석 동선이 다소 복잡하게 느껴질 수 있음', emoji: '🚶', badge: '보통', badgeClass: 'ib-normal' }
//     ],
//     insights: [
//       { emoji:'💰', title:'가성비가 가장 강한 경쟁력', desc:'리뷰에서 가격 대비 만족도가 자주 언급되며, 재방문 이유와 직접 연결되는 핵심 요소로 보입니다.' },
//       { emoji:'🏘️', title:'단골 기반 로컬 브랜드 성격이 뚜렷', desc:'주변 상권/인근 거주 고객의 반복 방문 비중이 높아 커뮤니티 기반 확장 전략이 유효합니다.' },
//       { emoji:'🪑', title:'혼잡도 관리가 평점 방어의 핵심', desc:'낮은 평점 리뷰는 대체로 붐비는 시간대의 착석·대기 경험과 연관되어 있습니다.' },
//       { emoji:'📣', title:'추천 기반 신규 유입 잠재력 보유', desc:'지인 추천, 입소문 방문 관련 언급이 많아 리뷰 및 추천 이벤트와의 궁합이 좋습니다.' }
//     ],
//     actions: [
//       { priority:'high', label:'H', cls:'ad-high', title:'피크타임 좌석 운영 최적화', desc:'혼잡 시간대 테이블 회전과 안내 프로세스를 정리하여 체감 대기시간 축소.', tags:['운영','즉시 실행'], deadline:'2주 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'단골 고객 리뷰 유도 프로그램', desc:'충성 고객 대상 간단한 리뷰/추천 이벤트로 신규 유입 촉진.', tags:['리뷰','마케팅'], deadline:'3주 이내' },
//       { priority:'medium', label:'M', cls:'ad-medium', title:'가성비 세트 메뉴 정비', desc:'대표 인기 메뉴를 묶은 세트 구성을 통해 주문 편의성과 객단가를 동시에 개선.', tags:['메뉴','가성비'], deadline:'1개월 이내' },
//       { priority:'low', label:'L', cls:'ad-low', title:'매장 동선/안내 문구 개선', desc:'입구, 주문, 착석 흐름을 직관적으로 만들어 첫 방문 고객 혼란 최소화.', tags:['공간','안내'], deadline:'1개월 이내' }
//     ],
//     keywords: {
//       positive: [
//         {t:'가성비 좋아요',s:'xl'},{t:'동네 맛집 느낌',s:'xl'},{t:'편하게 먹기 좋아요',s:'lg'},{t:'단골될 것 같아요',s:'lg'},
//         {t:'맛이 안정적',s:'sm'},{t:'친절해요',s:'sm'}
//       ],
//       negative: [
//         {t:'붐비는 시간대 복잡',s:'lg'},{t:'자리 없을 때 있음',s:'sm'},{t:'조금 시끄러움',s:'sm'}
//       ]
//     }
//   }
// };