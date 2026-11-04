import { apiRequest } from "./api";
import {
  getCachedRequest,
  invalidateCachedData,
  setCachedData,
  updateCachedData,
} from "./requestCache";

const PROFILE_TTL = 5 * 60 * 1000;
const profileCacheKey = (token) => `profile:${token}`;

export function primeProfileCache(token, profile) {
  setCachedData(profileCacheKey(token), profile, PROFILE_TTL);
}

export function getProfile(token) {
  return getCachedRequest(profileCacheKey(token), () => apiRequest("/auth/me", { token }), PROFILE_TTL);
}

export async function updateProfile(token, profile) {
  const updated = await apiRequest("/auth/me", {
    token,
    method: "PATCH",
    body: JSON.stringify(profile),
  });
  setCachedData(profileCacheKey(token), updated, PROFILE_TTL);
  return updated;
}

export async function uploadProfileAvatar(token, image) {
  const body = new FormData();
  body.append("image", image);
  const updated = await apiRequest("/auth/me/avatar", { token, method: "POST", body });
  updateCachedData(profileCacheKey(token), (profile) => ({
    ...profile,
    avatar_url: updated.avatar_url,
  }));
  return updated;
}

export async function deleteProfile(token) {
  const result = await apiRequest("/auth/me", { token, method: "DELETE" });
  invalidateCachedData("profile:");
  return result;
}
