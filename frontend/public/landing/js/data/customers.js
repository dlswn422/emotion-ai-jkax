// export const CUSTOMERS = {
//   store_1: {
//     summary: { total: 44, atRisk: 16, avgSatisfaction: 3.2 },
//     list: [
//       { id:1,  name:'Pierre Martin',    reviews:1,  rating:2, lastActivity:'2024-07-29', sentiment:'negative', churnPct:84,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩32,000', tags:['웨이팅 불만','가격 불만'] },
//       { id:2,  name:'Siti Rahayu',      reviews:3,  rating:5, lastActivity:'2026-02-14', sentiment:'positive', churnPct:8,   risk:'LOW',    visitFreq:'월 2회',    avgSpend:'₩48,000', tags:['음식 칭찬','재방문 의향'] },
//       { id:3,  name:'김민준',           reviews:2,  rating:4, lastActivity:'2026-01-20', sentiment:'positive', churnPct:18,  risk:'LOW',    visitFreq:'월 1회',    avgSpend:'₩41,000', tags:['분위기 칭찬'] },
//       { id:4,  name:'Dewi Santoso',     reviews:1,  rating:2, lastActivity:'2025-12-30', sentiment:'negative', churnPct:79,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩28,000', tags:['서비스 불만','웨이팅'] },
//       { id:5,  name:'이서연',           reviews:5,  rating:5, lastActivity:'2026-03-01', sentiment:'positive', churnPct:5,   risk:'LOW',    visitFreq:'주 1회',    avgSpend:'₩55,000', tags:['단골','음식 품질','추천'] },
//       { id:6,  name:'Budi Prasetyo',    reviews:1,  rating:3, lastActivity:'2025-12-15', sentiment:'neutral',  churnPct:52,  risk:'MEDIUM', visitFreq:'첫 방문',   avgSpend:'₩35,000', tags:['보통','기대 이하'] },
//       { id:7,  name:'박지훈',           reviews:2,  rating:3, lastActivity:'2026-01-05', sentiment:'neutral',  churnPct:47,  risk:'MEDIUM', visitFreq:'가끔',      avgSpend:'₩38,000', tags:['보통 만족'] },
//       { id:8,  name:'Rina Wulandari',   reviews:4,  rating:5, lastActivity:'2026-02-28', sentiment:'positive', churnPct:6,   risk:'LOW',    visitFreq:'월 2회',    avgSpend:'₩52,000', tags:['분위기 최고','데이트 추천'] },
//       { id:9,  name:'최유진',           reviews:1,  rating:1, lastActivity:'2025-12-20', sentiment:'negative', churnPct:93,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩30,000', tags:['매우 불만','웨이팅 1시간'] },
//       { id:10, name:'Agus Setiawan',    reviews:2,  rating:4, lastActivity:'2026-01-18', sentiment:'positive', churnPct:21,  risk:'LOW',    visitFreq:'가끔',      avgSpend:'₩43,000', tags:['음식 좋음'] },
//       { id:11, name:'정수민',           reviews:3,  rating:4, lastActivity:'2026-02-10', sentiment:'positive', churnPct:15,  risk:'LOW',    visitFreq:'월 1회',    avgSpend:'₩47,000', tags:['재방문','가성비'] },
//       { id:12, name:'Maya Putri',       reviews:1,  rating:2, lastActivity:'2026-01-02', sentiment:'negative', churnPct:71,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩31,000', tags:['서비스 미흡'] },
//       { id:13, name:'한도윤',           reviews:6,  rating:5, lastActivity:'2026-03-05', sentiment:'positive', churnPct:3,   risk:'LOW',    visitFreq:'주 1회',    avgSpend:'₩61,000', tags:['충성 고객','VIP 후보'] },
//       { id:14, name:'Lina Kusuma',      reviews:1,  rating:3, lastActivity:'2025-12-28', sentiment:'neutral',  churnPct:58,  risk:'MEDIUM', visitFreq:'첫 방문',   avgSpend:'₩36,000', tags:['평범한 경험'] },
//       { id:15, name:'오태양',           reviews:2,  rating:4, lastActivity:'2026-02-20', sentiment:'positive', churnPct:22,  risk:'LOW',    visitFreq:'가끔',      avgSpend:'₩44,000', tags:['분위기 좋음'] },
//       { id:16, name:'Hendra Gunawan',   reviews:1,  rating:2, lastActivity:'2025-12-10', sentiment:'negative', churnPct:88,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩29,000', tags:['음식 실망','재방문 없음'] },
//     ]
//   },
//   store_2: {
//     summary: { total: 28, atRisk: 6, avgSatisfaction: 4.4 },
//     list: [
//       { id:1,  name:'Fatimah Zahra',    reviews:4,  rating:5, lastActivity:'2026-03-01', sentiment:'positive', churnPct:4,   risk:'LOW',    visitFreq:'주 1회',    avgSpend:'₩44,000', tags:['할랄 최고','단골'] },
//       { id:2,  name:'Ahmad Fauzi',      reviews:2,  rating:5, lastActivity:'2026-02-20', sentiment:'positive', churnPct:7,   risk:'LOW',    visitFreq:'월 2회',    avgSpend:'₩40,000', tags:['신선도 칭찬'] },
//       { id:3,  name:'이채원',           reviews:1,  rating:3, lastActivity:'2026-01-15', sentiment:'neutral',  churnPct:49,  risk:'MEDIUM', visitFreq:'첫 방문',   avgSpend:'₩35,000', tags:['메뉴 적음'] },
//       { id:4,  name:'Sari Dewi',        reviews:3,  rating:5, lastActivity:'2026-02-28', sentiment:'positive', churnPct:5,   risk:'LOW',    visitFreq:'월 2회',    avgSpend:'₩46,000', tags:['재방문 확정'] },
//       { id:5,  name:'Usman Hakim',      reviews:1,  rating:2, lastActivity:'2025-12-25', sentiment:'negative', churnPct:77,  risk:'HIGH',   visitFreq:'첫 방문',   avgSpend:'₩32,000', tags:['메뉴 부족','기대 이하'] },
//       { id:6,  name:'Nurul Huda',       reviews:5,  rating:5, lastActivity:'2026-03-07', sentiment:'positive', churnPct:3,   risk:'LOW',    visitFreq:'주 2회',    avgSpend:'₩52,000', tags:['충성 고객','할랄 추천'] },
//     ]
//   }
// };