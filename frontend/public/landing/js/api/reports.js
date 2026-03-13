import { apiFetch, API_BASE } from "./client.js";

export async function analyzeCx(storeId, from, to) {
  const params = new URLSearchParams({
    store_id: storeId,
  });

  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const res = await fetch(`${API_BASE}/analysis/cx-analysis?${params.toString()}`, {
    method: "POST",
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