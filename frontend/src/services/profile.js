import { apiRequest } from "./api";

export function getProfile(token) {
  return apiRequest("/auth/me", { token });
}

export function updateProfile(token, profile) {
  return apiRequest("/auth/me", {
    token,
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}