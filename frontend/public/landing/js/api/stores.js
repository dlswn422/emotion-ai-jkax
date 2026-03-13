import { apiFetch } from "../client.js";

export async function getStores() {
  return apiFetch("/stores");
}

export async function syncReviews() {
  return apiFetch("/stores/sync-reviews", {
    method: "POST",
  });
}

export async function getStoreDetail(storeId) {
  return apiFetch(`/stores/${encodeURIComponent(storeId)}`);
}