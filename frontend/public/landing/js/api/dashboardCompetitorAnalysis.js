import { apiFetch } from "./client.js";

/**
 * B2B 경쟁사 분석 데이터 조회
 * - 백엔드 응답 shape:
 *   {
 *     tenant_id,
 *     kpis: {},
 *     keyword_hits: [],
 *     competitor_details: []
 *   }
 * - B2BCompetitiveSection.js가 기대하는 형태로 변환해서 반환
 */
export async function fetchDashboardCompetitorAnalysis(tenantId, from, to) {
  const params = new URLSearchParams();

  if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
    params.append("tenant_id", tenantId);
  }

  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const query = params.toString();
  const url = query
    ? `/dashboard/competitor-analysis?${query}`
    : `/dashboard/competitor-analysis`;

  const json = await apiFetch(url);

  console.log("[competitor api] tenantId =", tenantId);
  console.log("[competitor api] query =", query);
  console.log("[competitor api] url =", url);
  console.log("[competitor api] raw json =", json);
  console.log("[competitor api] keyword_hits length =", json?.keyword_hits?.length);
  console.log("[competitor api] competitor_details length =", json?.competitor_details?.length);

  // competitor_details에서 source 목록 중복 제거
  const sourceMap = new Map();

  if (Array.isArray(json?.competitor_details)) {
    json.competitor_details.forEach((row) => {
      const siteName = row?.source_label ?? "";
      const sourceUrl = row?.source_url ?? "";

      if (!siteName) return;

      if (!sourceMap.has(siteName)) {
        sourceMap.set(siteName, {
          site_name: siteName,
          url: sourceUrl,
          active: true,
        });
      }
    });
  }

  const mappedIssueSources = Array.from(sourceMap.values());

  const mappedIssueKeywords = Array.isArray(json?.competitor_details)
    ? json.competitor_details.map((row, idx) => ({
        _id: `${row?.keyword ?? "kw"}-${row?.company_name ?? "comp"}-${idx}`,
        keyword: row?.keyword ?? "",
        signal_level:
          String(row?.signal_level ?? "MEDIUM").toUpperCase() === "HIGH"
            ? "high"
            : String(row?.signal_level ?? "MEDIUM").toUpperCase() === "LOW"
            ? "low"
            : "medium",
        hit_count: 1,
        last_hit: row?.detected_at ?? "",
        active: true,
        source_name: row?.source_label ?? "",
        competitor_name: row?.company_name ?? "",
        opportunity: row?.summary ?? "",
      }))
    : [];

  console.log("[competitor api] mappedIssueSources =", mappedIssueSources);
  console.log("[competitor api] mappedIssueSources length =", mappedIssueSources.length);
  console.log("[competitor api] mappedIssueKeywords =", mappedIssueKeywords);
  console.log("[competitor api] mappedIssueKeywords length =", mappedIssueKeywords.length);

  return {
    issueSources: mappedIssueSources,
    issueKeywords: mappedIssueKeywords,
  };
}