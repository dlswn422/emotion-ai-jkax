import { apiFetch } from "./client.js";

/**
 * B2B 경쟁사 분석 데이터 조회 (period_type 기반 캐시 조회)
 *
 * @param {number} tenantId
 * @param {string} periodType - "1D" | "7D" | "30D" | "90D" | "180D"
 */
export async function fetchDashboardCompetitorAnalysis(tenantId, periodType = "30D") {
  const params = new URLSearchParams();

  if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
    params.append("tenant_id", tenantId);
  }
  params.append("period_type", periodType);

  const json = await apiFetch(`/dashboard/competitor-analysis?${params.toString()}`);

  // 신형: 캐시 조회형 최종 구조
  if (Array.isArray(json?.issueSources) || Array.isArray(json?.issueKeywords)) {
    return {
      issueSources: Array.isArray(json?.issueSources) ? json.issueSources : [],
      issueKeywords: Array.isArray(json?.issueKeywords) ? json.issueKeywords : [],
      ...(json?.message ? { message: json.message } : {}),
    };
  }

  // 구형 fallback
  const sourceMap = new Map();
  if (Array.isArray(json?.competitor_details)) {
    json.competitor_details.forEach((d) => {
      if (d?.source_url) {
        sourceMap.set(d.source_url, {
          site_name: d.source_name || d.source_url,
          url: d.source_url,
        });
      }
    });
  }

  return {
    issueKeywords: Array.isArray(json?.keyword_hits)
      ? json.keyword_hits.map((row, idx) => ({
          _id: `${row?.keyword ?? "kw"}-${idx}`,
          keyword: row?.keyword ?? "",
          signal_level: String(row?.level ?? "medium").toLowerCase(),
          hit_count: Number(row?.hit_count ?? 0),
          last_hit: row?.last_detected_at ?? "",
          competitor_name: row?.company_name ?? "",
          source_name: row?.source ?? "",
          opportunity: row?.summary ?? "",
          active: true,
        }))
      : [],
    issueSources: Array.from(sourceMap.values()),
  };
}