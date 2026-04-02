export const SONGPA_DONGS = [
  { id:'pungnap1', name:'풍납1동', score:72, sentiment:{pos:68,neg:14,neu:18}, posts:1240, trend:+3.2, keywords:['한강공원','자전거','산책로','주차불편','재개발'], topIssue:'한강 접근성 및 공원 환경 개선 요구', recentSignal:'고수부지 시설 노후화 민원 증가', category:'주거·환경' },
  { id:'pungnap2', name:'풍납2동', score:61, sentiment:{pos:55,neg:24,neu:21}, posts:980,  trend:-1.5, keywords:['교통체증','버스노선','보육원','소음','생활편의'], topIssue:'대중교통 노선 불편 및 보육시설 부족', recentSignal:'간선도로 교통체증 민원 상승세', category:'교통·교육' },
  { id:'geoyeo',   name:'거여동',  score:58, sentiment:{pos:52,neg:28,neu:20}, posts:1560, trend:-2.8, keywords:['지하철','쓰레기','불법주차','공원부족','가로등'], topIssue:'주거환경 낙후 및 공공시설 부족', recentSignal:'야간 불법주차 민원 급증', category:'주거·안전' },
  { id:'macheon1', name:'마천1동', score:54, sentiment:{pos:48,neg:32,neu:20}, posts:870,  trend:-4.1, keywords:['재개발','노후주택','주차난','환경개선','구청민원'], topIssue:'노후 주거지역 재개발 요구 강화', recentSignal:'재개발 추진 지연 불만 최고조', category:'재개발·주거' },
  { id:'macheon2', name:'마천2동', score:56, sentiment:{pos:50,neg:30,neu:20}, posts:740,  trend:-1.2, keywords:['노후화','골목길','안전','가로수','배수'], topIssue:'골목 보행환경 개선 요구', recentSignal:'노후 하수관 누수 민원 접수', category:'주거·환경' },
  { id:'songpa',   name:'송파동',  score:78, sentiment:{pos:74,neg:11,neu:15}, posts:2100, trend:+5.4, keywords:['전통시장','먹거리','축제','골목상권','청결'], topIssue:'송파 전통시장 활성화 긍정 평가', recentSignal:'골목상권 활성화 프로그램 호평', category:'상권·문화' },
  { id:'seokchon', name:'석촌동',  score:82, sentiment:{pos:78,neg:9, neu:13}, posts:3200, trend:+7.1, keywords:['석촌호수','벚꽃','카페거리','나들이','롯데월드'], topIssue:'석촌호수 봄꽃 축제 만족도 최고', recentSignal:'호수 주변 음식점 쓰레기 민원 소폭', category:'관광·문화' },
  { id:'samjeon',  name:'삼전동',  score:75, sentiment:{pos:70,neg:13,neu:17}, posts:1450, trend:+2.6, keywords:['한강뷰','아파트','생활편의','조용한','주차'], topIssue:'주거 만족도 높음, 주차 공간 부족 지속', recentSignal:'신규 편의시설 입점 긍정 반응', category:'주거·편의' },
  { id:'garak1',   name:'가락1동', score:65, sentiment:{pos:60,neg:20,neu:20}, posts:1890, trend:+1.3, keywords:['가락시장','농수산물','교통','재개발','상인'], topIssue:'가락시장 현대화 사업 기대감', recentSignal:'시장 주변 교통혼잡 민원 지속', category:'상권·교통' },
  { id:'garak2',   name:'가락2동', score:68, sentiment:{pos:63,neg:18,neu:19}, posts:1120, trend:+0.8, keywords:['학원가','교육','도서관','공원','아이들'], topIssue:'교육환경 만족도 높음', recentSignal:'공공 독서실 신설 요청 증가', category:'교육·육아' },
  { id:'munjeong', name:'문정동',  score:71, sentiment:{pos:66,neg:16,neu:18}, posts:2340, trend:+3.5, keywords:['법조타운','오피스','카페','출퇴근','음식점'], topIssue:'법조타운 주변 상권 활성화 긍정', recentSignal:'출퇴근 교통체증 해소 요청', category:'업무·상권' },
  { id:'jangji',   name:'장지동',  score:74, sentiment:{pos:69,neg:14,neu:17}, posts:1680, trend:+4.2, keywords:['위례신도시','산책','쇼핑몰','청결','신축아파트'], topIssue:'위례 연접 지역 정주환경 우수', recentSignal:'대형마트 주변 주차 불편 민원', category:'주거·편의' },
  { id:'mateo',    name:'방이3동', score:54, sentiment:{pos:48,neg:32,neu:20}, posts:760,  trend:-3.0, keywords:['재건축','주차난','어르신','복지','경로당'], topIssue:'고령 인구 복지 서비스 요구', recentSignal:'경로당 시설 노후화 민원', category:'복지·주거' },
  { id:'bangyi1',  name:'방이1동', score:79, sentiment:{pos:75,neg:10,neu:15}, posts:1920, trend:+6.0, keywords:['올림픽공원','체육시설','반려동물','야외행사','잔디'], topIssue:'올림픽공원 이용 만족도 매우 높음', recentSignal:'반려동물 놀이터 확대 요청', category:'공원·문화' },
  { id:'bangyi2',  name:'방이2동', score:76, sentiment:{pos:72,neg:12,neu:16}, posts:1530, trend:+3.8, keywords:['먹자골목','음식점','야간활동','편의점','주택가'], topIssue:'먹자골목 야간 유동인구 활성화', recentSignal:'야간 소음 민원 소폭 증가', category:'상권·생활' },
  { id:'oryun',    name:'오륜동',  score:83, sentiment:{pos:79,neg:8, neu:13}, posts:1050, trend:+8.2, keywords:['올림픽선수촌','한강뷰','조용함','고급주거','자연환경'], topIssue:'자연환경·고급주거 만족도 최상위', recentSignal:'주변 개발 사업 소음 민원 소폭', category:'주거·환경' },
  { id:'ogeum',    name:'오금동',  score:67, sentiment:{pos:62,neg:19,neu:19}, posts:1340, trend:+1.0, keywords:['오금공원','지하철','재개발','편의시설','노인'], topIssue:'공원 이용 만족, 재개발 기대감 혼재', recentSignal:'지하철 역 주변 개선 요청', category:'주거·교통' },
  { id:'songpa2',  name:'잠실본동', score:88, sentiment:{pos:84,neg:6, neu:10}, posts:4200, trend:+9.5, keywords:['잠실롯데','쇼핑','관광','한강','야경'], topIssue:'잠실 상권 및 관광 만족도 최고 수준', recentSignal:'주말 인파 교통 혼잡 민원', category:'상권·관광' },
  { id:'jamsil2',  name:'잠실2동', score:85, sentiment:{pos:81,neg:8, neu:11}, posts:3600, trend:+7.8, keywords:['잠실역','아파트','생활편의','쇼핑','스타벅스'], topIssue:'생활 인프라 우수, 고만족 주거지', recentSignal:'주차 공간 부족 만성적 민원', category:'주거·편의' },
  { id:'jamsil3',  name:'잠실3동', score:80, sentiment:{pos:76,neg:10,neu:14}, posts:2850, trend:+4.9, keywords:['학원가','교육열','아파트','공원','청소년'], topIssue:'교육·주거 환경 우수, 청소년 시설 요청', recentSignal:'학원가 주변 불법주정차 민원', category:'교육·주거' },
  { id:'jamsil4',  name:'잠실4동', score:77, sentiment:{pos:73,neg:12,neu:15}, posts:2100, trend:+3.1, keywords:['잠실나루','공원산책','자전거도로','카페','한강'], topIssue:'한강 접근성 우수, 자전거 인프라 호평', recentSignal:'자전거 도로 확장 요청 증가', category:'공원·문화' },
  { id:'jamsil6',  name:'잠실6동', score:73, sentiment:{pos:68,neg:15,neu:17}, posts:1780, trend:+2.4, keywords:['잠실종합운동장','행사','콘서트','주차','소음'], topIssue:'대형 행사 주변 교통 불편 지속', recentSignal:'콘서트 야간 소음 민원 집중', category:'문화·교통' },
  { id:'sincheon', name:'신천동',  score:86, sentiment:{pos:82,neg:7, neu:11}, posts:3900, trend:+8.6, keywords:['잠실한강공원','먹거리타운','야경','데이트','활성화'], topIssue:'한강공원·먹거리타운 만족도 최상위', recentSignal:'한강 주변 쓰레기 투기 민원 소폭', category:'관광·상권' },
  { id:'goejeong', name:'가락본동', score:63, sentiment:{pos:58,neg:22,neu:20}, posts:1020, trend:-0.5, keywords:['구시가지','재건축','골목','주차','어르신'], topIssue:'노후 주거지 정비 필요성 제기', recentSignal:'골목 가로등 교체 요청 증가', category:'재개발·주거' },
  { id:'wiryesinmot', name:'위례동', score:81, sentiment:{pos:77,neg:9,neu:14}, posts:2200, trend:+6.4, keywords:['위례신도시','공원','신축아파트','편의시설','안전'], topIssue:'신도시 정주환경 우수, 교통 인프라 요청', recentSignal:'위례-과천선 조기 개통 요청 집중', category:'주거·교통' },
];

export const DONG_PATHS = {
  mateo:        { d:'M 22,175 L 72,165 L 82,205 L 75,248 L 40,255 L 18,228 Z', cx:52, cy:215 },
  jamsil2:      { d:'M 72,165 L 152,152 L 168,183 L 162,232 L 138,260 L 102,268 L 82,248 L 82,205 Z', cx:122, cy:215 },
  songpa2:      { d:'M 75,248 L 102,268 L 138,260 L 145,292 L 128,322 L 95,326 L 65,308 L 55,280 Z', cx:102, cy:292 },
  samjeon:      { d:'M 138,260 L 162,232 L 195,238 L 208,268 L 195,298 L 168,310 L 145,295 Z', cx:172, cy:272 },
  seokchon:     { d:'M 168,310 L 195,298 L 208,268 L 222,272 L 222,340 L 212,340 L 185,332 Z', cx:193, cy:315 },
  songpa:       { d:'M 95,326 L 128,322 L 145,295 L 168,310 L 185,332 L 172,362 L 142,370 L 112,355 Z', cx:143, cy:340 },
  jamsil3:      { d:'M 152,152 L 228,142 L 248,168 L 244,205 L 218,222 L 195,238 L 162,232 L 168,183 Z', cx:204, cy:192 },
  jamsil6:      { d:'M 228,142 L 305,132 L 328,158 L 322,195 L 295,212 L 265,220 L 244,205 L 248,168 Z', cx:282, cy:178 },
  pungnap2:     { d:'M 305,132 L 385,122 L 402,148 L 390,182 L 362,198 L 328,195 L 322,195 L 328,158 Z', cx:358, cy:162 },
  pungnap1:     { d:'M 385,122 L 462,115 L 478,142 L 468,175 L 440,190 L 408,188 L 390,182 L 402,148 Z', cx:432, cy:155 },
  oryun:        { d:'M 462,115 L 535,108 L 568,132 L 572,165 L 545,185 L 512,192 L 485,182 L 468,175 L 478,142 Z', cx:518, cy:152 },
  bangyi2:      { d:'M 265,220 L 295,212 L 322,195 L 362,198 L 372,228 L 355,255 L 322,268 L 292,262 L 272,245 Z', cx:318, cy:235 },
  bangyi1:      { d:'M 362,198 L 390,182 L 440,190 L 462,215 L 455,248 L 422,265 L 395,262 L 375,248 L 372,228 Z', cx:415, cy:228 },
  garak2:       { d:'M 218,222 L 244,205 L 265,220 L 272,245 L 252,270 L 228,268 L 208,252 Z', cx:240, cy:245 },
  garak1:       { d:'M 222,272 L 250,302 L 238,332 L 222,340 Z', cx:238, cy:322 },
  ogeum:        { d:'M 395,262 L 422,265 L 455,248 L 468,272 L 462,302 L 432,318 L 400,312 L 382,295 Z', cx:425, cy:285 },
  goejeong:     { d:'M 292,262 L 322,268 L 355,255 L 368,275 L 362,308 L 332,322 L 305,315 L 288,295 Z', cx:325, cy:290 },
  munjeong:     { d:'M 198,305 L 218,342 L 238,332 L 250,302 L 268,308 L 272,342 L 255,368 L 228,378 L 205,365 L 192,345 Z', cx:232, cy:342 },
  macheon2:     { d:'M 512,192 L 545,185 L 572,165 L 595,180 L 600,215 L 575,240 L 548,248 L 522,242 L 505,222 Z', cx:553, cy:212 },
  macheon1:     { d:'M 548,248 L 575,240 L 600,215 L 620,230 L 622,268 L 598,292 L 568,298 L 545,282 Z', cx:582, cy:262 },
  geoyeo:       { d:'M 462,302 L 468,272 L 498,265 L 528,258 L 548,278 L 545,312 L 518,332 L 488,332 L 468,318 Z', cx:505, cy:300 },
  jangji:       { d:'M 205,365 L 228,378 L 255,368 L 272,342 L 295,348 L 300,382 L 278,408 L 248,418 L 218,408 L 202,388 Z', cx:252, cy:385 },
  wiryesinmot:  { d:'M 278,408 L 300,382 L 328,385 L 358,378 L 375,400 L 368,432 L 335,450 L 298,448 L 275,430 Z', cx:325, cy:415 },
  sincheon:     { d:'M 468,318 L 488,332 L 518,332 L 545,318 L 558,342 L 555,375 L 528,390 L 498,388 L 475,372 L 462,348 Z', cx:512, cy:355 },
};

export function mmScoreToColor(score, alpha=0.85) {
  if (score>=80) return 'rgba(16,185,129,'+alpha+')';
  if (score>=70) return 'rgba(52,211,153,'+alpha+')';
  if (score>=60) return 'rgba(251,191,36,'+alpha+')';
  if (score>=50) return 'rgba(251,146,60,'+alpha+')';
  return 'rgba(239,68,68,'+alpha+')';
}

export function mmScoreToLabel(score) {
  if (score>=80) return '매우긍정';
  if (score>=70) return '긍정';
  if (score>=60) return '보통';
  if (score>=50) return '부정우려';
  return '부정';
}

export function mmScoreToBg(score) {
  if (score>=80) return '#ecfdf5';
  if (score>=70) return '#d1fae5';
  if (score>=60) return '#fef3c7';
  if (score>=50) return '#ffedd5';
  return '#fee2e2';
}

export function mmScoreToTextColor(score) {
  if (score>=80) return '#065f46';
  if (score>=70) return '#047857';
  if (score>=60) return '#92400e';
  if (score>=50) return '#9a3412';
  return '#991b1b';
}

export const MM_GU_STATS = (function() {
  const avg = Math.round(SONGPA_DONGS.reduce((s,d)=>s+d.score,0)/SONGPA_DONGS.length);
  const totalPosts = SONGPA_DONGS.reduce((s,d)=>s+d.posts,0);
  const highDongs  = SONGPA_DONGS.filter(d=>d.score>=80).length;
  const lowDongs   = SONGPA_DONGS.filter(d=>d.score<60).length;
  const avgTrend   = (SONGPA_DONGS.reduce((s,d)=>s+d.trend,0)/SONGPA_DONGS.length).toFixed(1);
  const kwMap = {};
  SONGPA_DONGS.forEach(d=>d.keywords.forEach(k=>{ kwMap[k]=(kwMap[k]||0)+1; }));
  const topKws = Object.entries(kwMap).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([kw,cnt])=>({kw,cnt}));
  return { avg, totalPosts, highDongs, lowDongs, avgTrend, topKws };
})();