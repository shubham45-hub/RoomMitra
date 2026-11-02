import { apiRequest } from "./api";

export function requestOtp(phone) {
  return apiRequest("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone, code) {
  return apiRequest("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}