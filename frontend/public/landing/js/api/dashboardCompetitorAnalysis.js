import { apiFetch } from "./client.js";

/**
 * B2B 경쟁사 분석 데이터 조회
 * - B2BCompetitiveSection.js가 현재 기대하는 데이터 형태에 맞춰 반환
 * - 반환 shape:
 *   {
 *     issueSources: [],
 *     issueKeywords: []
 *   }
 */
export async function fetchDashboardCompetitorAnalysis(compId, from, to) {
  const params = new URLSearchParams();

  if (compId) params.append("comp_id", compId);
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const query = params.toString();
  const url = query
    ? `/dashboard/competitor-analysis?${query}`
    : `/dashboard/competitor-analysis`;

  const json = await apiFetch(url);

  return {
    issueSources: Array.isArray(json?.issueSources)
      ? json.issueSources.map((row) => ({
          site_name: row?.site_name ?? "",
          url: row?.url ?? "",
          active: row?.active,
        }))
      : [],

    issueKeywords: Array.isArray(json?.issueKeywords)
      ? json.issueKeywords.map((row) => ({
          _id: row?._id ?? null,
          keyword: row?.keyword ?? "",
          signal_level: row?.signal_level ?? "medium",
          hit_count: Number(row?.hit_count ?? 0),
          last_hit: row?.last_hit ?? "",
          active: row?.active,
          source_name: row?.source_name ?? "",
          competitor_name: row?.competitor_name ?? "",
          opportunity: row?.opportunity ?? "",
        }))
      : [],
  };
}