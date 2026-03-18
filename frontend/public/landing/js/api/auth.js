import { apiFetch, API_BASE } from "./client.js";

// export async function getAuthStatus() {
//   return apiFetch("/auth/status");
// }

export async function getGoogleBusinessStatus() {
  return apiFetch("/connect/google-business/status");
}

export function goGoogleBusinessConnect() {
  window.location.href = `${API_BASE}/connect/google-business`;
}

// export function goGoogleLogin() {
//   window.location.href = `${API_BASE}/auth/google/login`;
// }