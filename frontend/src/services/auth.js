import { apiRequest } from "./api";

export function signUp({ name, phone, password }) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, phone, password }),
  });
}

export function signIn(phone, password) {
  return apiRequest("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export function requestPasswordReset(phone) {
  return apiRequest("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function confirmPasswordReset(phone, code, newPassword) {
  return apiRequest("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ phone, code, new_password: newPassword }),
  });
}