import { apiFetch } from "./client.js";

/**
 * B2B 고객 동향 분석 데이터 조회
 * - 백엔드 응답 shape:
 *   {
 *     tenant_id,
 *     kpis: {},
 *     keyword_hits: [],
 *     opportunity_cards: []
 *   }
 * - B2BCustomerTrendSection.js가 기대하는 형태로 변환해서 반환
 */
export async function fetchDashboardCustomerTrend(tenantId) {
  const params = new URLSearchParams();

  if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
    params.append("tenant_id", tenantId);
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