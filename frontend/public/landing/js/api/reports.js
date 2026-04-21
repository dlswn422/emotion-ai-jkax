import { apiFetch, API_BASE } from "./client.js";

export async function analyzeCx(storeId, from, to, periodType) {
  const params = new URLSearchParams({
    store_id: storeId,
  });

  if (periodType) params.append("period_type", periodType);
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const res = await fetch(
    `${API_BASE}/analysis/cx-analysis?${params.toString()}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(
      json?.detail?.message ||
        json?.detail ||
        `CX analysis failed: ${res.status}`
    );

    err.code = json?.detail?.code || "CX_ANALYSIS_ERROR";
    err.status = res.status;
    err.payload = json;

    throw err;
  }

  return json;
}

// debug / fallback 전용.
// 운영 report 화면에서는 더 이상 사용하지 않음.
export async function getRatingTrend(storeId, unit = "day", from, to) {
  const params = new URLSearchParams({
    store_id: storeId,
    unit,
  });

  if (from) params.append("from", from);
  if (to) params.append("to", to);

  return apiFetch(`/dashboard/rating-trend?${params.toString()}`);
}