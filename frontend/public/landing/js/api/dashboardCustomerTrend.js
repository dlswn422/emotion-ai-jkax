import { apiFetch } from "./client.js";

/**
 * B2B 고객 동향 분석 데이터 조회 (period_type 기반 캐시 조회)
 *
 * @param {number} tenantId
 * @param {string} periodType - "1D" | "7D" | "30D" | "90D" | "180D"
 */
export async function fetchDashboardCustomerTrend(tenantId, periodType = "30D") {
  const params = new URLSearchParams();

  if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
    params.append("tenant_id", tenantId);
  }
  params.append("period_type", periodType);

  const json = await apiFetch(`/dashboard/customer-trend?${params.toString()}`);

  // 신형: 캐시 조회형 최종 구조
  if (Array.isArray(json?.signalKeywords) || Array.isArray(json?.prospects)) {
    return {
      signalKeywords: Array.isArray(json?.signalKeywords) ? json.signalKeywords : [],
      prospects: Array.isArray(json?.prospects) ? json.prospects : [],
      ...(json?.message ? { message: json.message } : {}),
    };
  }

  // 구형 fallback
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