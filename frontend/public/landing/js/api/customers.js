import { apiFetch } from "./client.js";

export async function getCustomers(storeId, from, to) {
  const qs = new URLSearchParams({ from, to });

  const json = await apiFetch(
    `/stores/${encodeURIComponent(storeId)}/customers?${qs.toString()}`
  );

  return {
    summary: json.summary || {},
    risk_distribution: json.risk_distribution || {},
    visit_frequency_distribution: json.visit_frequency_distribution || {},
    segments: json.segments || {},
    cohort: json.cohort || { rows: [], summary_text: "" },
    customers: (json.customers || []).map((c) => ({
      author_name: c.author_name,
      total_reviews: c.review_count,
      avg_rating: c.avg_rating,
      last_review_at: c.last_activity,
      sentiment: c.sentiment,
      churn_probability: Number(c.churn_score ?? 0) / 100,
      risk_level: c.churn_level,
      visit_frequency_label: c.visit_frequency_label || "-",
      avg_spend: c.avg_spend || null,
      tags: c.tags || [],
    })),
  };
}