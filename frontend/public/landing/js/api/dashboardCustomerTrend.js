import { apiFetch } from "./client.js";

/**
 * B2B 고객 동향 분석 데이터 조회
 * - 순위표: 사용자가 선택한 기간 기준
 * - 일별 추이: 오늘 기준 최근 14일 실데이터
 * - 월별 추이: 오늘 기준 최근 6개월 HIGH/MED/LOW 집계
 */
export async function fetchDashboardCustomerTrend(tenantId, from, to) {
  const params = new URLSearchParams();

  if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
    params.append("tenant_id", tenantId);
  }

  if (from !== undefined && from !== null && from !== "") {
    params.append("from", from);
  }

  if (to !== undefined && to !== null && to !== "") {
    params.append("to", to);
  }

  const query = params.toString();
  const url = query
    ? `/dashboard/customer-trend?${query}`
    : `/dashboard/customer-trend`;

  const json = await apiFetch(url);

  return {
    signalKeywords: Array.isArray(json?.keyword_hits)
      ? json.keyword_hits.map((row, idx) => ({
          _id: `${row?.keyword ?? "kw"}-${idx}`,
          keyword: row?.keyword ?? "",
          kw_type: row?.category ?? "이벤트",
          signal_level: String(row?.level ?? "medium").toLowerCase(),
          hit_count: Number(row?.hit_count ?? 0),
          last_hit: row?.last_detected_at ?? "",
          active: true,
        }))
      : [],

    // 최근 14일 일별 추이 실데이터
    dailyTrend: Array.isArray(json?.daily_trend)
      ? json.daily_trend.map((row) => ({
          date: row?.date ?? "",
          keyword: row?.keyword ?? "",
          category: row?.category ?? "",
          level: String(row?.level ?? "MEDIUM").toUpperCase(),
          hit_count: Number(row?.hit_count ?? 0),
        }))
      : [],

    // 최근 6개월 월별 HIGH/MED/LOW 집계
    monthlyTrend: Array.isArray(json?.monthly_trend)
      ? json.monthly_trend.map((row) => ({
          month: row?.month ?? "",
          signal_level: String(row?.signal_level ?? "MEDIUM").toUpperCase(),
          hit_count: Number(row?.hit_count ?? 0),
        }))
      : [],

    prospects: Array.isArray(json?.opportunity_cards)
      ? json.opportunity_cards.map((row, idx) => ({
          _id: `${row?.corp_code ?? row?.company_name ?? "prospect"}-${idx}`,
          prospect_name: row?.company_name ?? "",
          industry: row?.industry_label ?? "",
          signal: row?.signal_keyword ?? "",
          source: row?.source_label ?? "",
          detected_at: row?.detected_at ?? "",
          opportunity_grade:
            String(row?.signal_level ?? "MEDIUM").toUpperCase() === "HIGH"
              ? "high"
              : String(row?.signal_level ?? "MEDIUM").toUpperCase() === "LOW"
                ? "low"
                : "medium",
          sales_status: "new",
          note: row?.summary ?? "",
          ref_url: row?.source_url ?? "",
        }))
      : [],
  };
}
