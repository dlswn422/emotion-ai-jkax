import { apiFetch, API_BASE } from "./client.js";

/**
 * CX 분석 결과 조회 (캐시 조회형)
 *
 * 기존:
 *   analyzeCx(storeId, from, to)
 *
 * 변경:
 *   analyzeCx(storeId, periodType)
 *
 * periodType:
 *   "1D" | "7D" | "30D" | "90D" | "180D"
 */
export async function analyzeCx(storeId, periodType = "30D") {
  const params = new URLSearchParams({
    store_id: storeId,
    period_type: periodType,
  });

  const res = await fetch(`${API_BASE}/analysis/cx-analysis?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`CX analysis failed: ${res.status}`);
  }

  return res.json();
}

export async function getRatingTrend(storeId, unit = "day", from, to) {
  const params = new URLSearchParams({
    store_id: storeId,
    unit,
  });

  if (from) params.append("from", from);
  if (to) params.append("to", to);

  return apiFetch(`/dashboard/rating-trend?${params.toString()}`);
}