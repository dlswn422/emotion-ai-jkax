import { apiFetch } from "./client.js";

/**
 * B2B 경쟁사 분석 데이터 조회
 * 지원 shape:
 *
 * 1) 신형(캐시 조회형, 백엔드 최종 JSON 그대로)
 * {
 *   issueSources: [],
 *   issueKeywords: []
 * }
 *
 * 2) 구형(예전 raw 응답)
 * {
 *   tenant_id,
 *   kpis: {},
 *   keyword_hits: [],
 *   competitor_details: []
 * }
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

  // 신형: 이미 최종 구조면 그대로 반환
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

  const keywordMetaMap = new Map();

  if (Array.isArray(json?.keyword_hits)) {
    json.keyword_hits.forEach((row) => {
      const keyword = row?.keyword ?? "";
      if (!keyword) return;

      keywordMetaMap.set(keyword, {
        hit_count: Number(row?.hit_count ?? 0),
        last_hit: row?.last_detected_at ?? "",
        signal_level:
          String(row?.level ?? "MEDIUM").toUpperCase() === "HIGH"
            ? "high"
            : String(row?.level ?? "MEDIUM").toUpperCase() === "LOW"
            ? "low"
            : "medium",
      });
    });
  }

  const mappedIssueSources = Array.from(sourceMap.values());

  const mappedIssueKeywords = Array.isArray(json?.competitor_details)
    ? json.competitor_details.map((row, idx) => {
        const meta = keywordMetaMap.get(row?.keyword ?? "") || {};

        return {
          _id: `${row?.keyword ?? "kw"}-${row?.company_name ?? "comp"}-${idx}`,
          keyword: row?.keyword ?? "",
          signal_level: meta.signal_level ?? "medium",
          hit_count: Number(meta.hit_count ?? 0),
          last_hit: meta.last_hit ?? row?.detected_at ?? "",
          active: true,
          source_name: row?.source_label ?? "",
          competitor_name: row?.company_name ?? "",
          opportunity: row?.summary ?? "",
        };
      })
    : [];

  return {
    issueSources: mappedIssueSources,
    issueKeywords: mappedIssueKeywords,
  };
}