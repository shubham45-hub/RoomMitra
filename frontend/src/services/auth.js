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