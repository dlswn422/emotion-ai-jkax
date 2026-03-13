import { apiFetch } from "./client.js";

/*
Expected backend contract

{
  "summary": {
    "total_customers": { "current": 44, "previous": 42, "delta_pct": 4.2 },
    "at_risk_customers": { "current": 16, "previous": 15, "delta_pct": 6.7 },
    "avg_satisfaction": { "current": 3.2, "previous": 2.9, "delta_value": 0.3 },
    "repeat_visit_rate": { "current": 62, "previous": 59, "delta_pct": 3.0 }
  },
  "risk_distribution": {
    "high": { "count": 16, "pct": 36.4, "avg_churn_pct": 88 },
    "medium": { "count": 7, "pct": 15.9 },
    "low": { "count": 21, "pct": 47.7 }
  },
  "visit_frequency_distribution": {
    "weekly_plus": 18,
    "monthly_2": 28,
    "monthly_1": 24,
    "occasional": 16,
    "first_visit": 14,
    "repeat_intent_rate": 78
  },
  "segments": {
    "loyal": { "count": 0, "share_pct": 0, "avg_rating": 4.8 },
    "new": { "count": 28, "share_pct": 64, "avg_rating": 3.6, "conversion_rate": 42 },
    "at_risk": { "count": 16, "share_pct": 36, "avg_rating": 1.8, "churn_probability": 82 },
    "reactivation": { "count": 7, "share_pct": 16, "avg_rating": 3.0, "reactivation_probability": 58 },
    "insights": []
  },
  "cohort": {
    "rows": [],
    "summary_text": ""
  },
  "customers": [
    {
      "author_name": "홍길동",
      "review_count": 3,
      "avg_rating": 4.2,
      "last_activity": "2026-03-01",
      "sentiment": "positive",
      "churn_score": 22,
      "churn_level": "LOW",
      "visit_frequency_label": "월 2회",
      "avg_spend": null,
      "tags": []
    }
  ]
}
*/

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