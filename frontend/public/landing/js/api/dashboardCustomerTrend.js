import { apiFetch } from "./client.js";

/**
 * B2B 고객 동향 분석 데이터 조회
 * - B2BCustomerTrendSection.js가 현재 기대하는 데이터 형태에 맞춰 반환
 * - 반환 shape:
 *   {
 *     signalKeywords: [],
 *     prospects: []
 *   }
 */
export async function fetchDashboardCustomerTrend(compId, from, to) {
  const params = new URLSearchParams();

  if (compId) params.append("comp_id", compId);
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const query = params.toString();
  const url = query
    ? `/dashboard/customer-trend?${query}`
    : `/dashboard/customer-trend`;

  const json = await apiFetch(url);

  return {
    signalKeywords: Array.isArray(json?.signalKeywords)
      ? json.signalKeywords.map((row) => ({
          _id: row?._id ?? null,
          keyword: row?.keyword ?? "",
          kw_type: row?.kw_type ?? "이벤트",
          signal_level: row?.signal_level ?? "medium",
          hit_count: Number(row?.hit_count ?? 0),
          last_hit: row?.last_hit ?? "",
          active: row?.active,
        }))
      : [],

    prospects: Array.isArray(json?.prospects)
      ? json.prospects.map((row) => ({
          _id: row?._id ?? null,
          prospect_name: row?.prospect_name ?? "",
          industry: row?.industry ?? "",
          signal: row?.signal ?? "",
          source: row?.source ?? "",
          detected_at: row?.detected_at ?? "",
          opportunity_grade: row?.opportunity_grade ?? "",
          sales_status: row?.sales_status ?? "",
          note: row?.note ?? "",
          ref_url: row?.ref_url ?? "",
        }))
      : [],
  };
}