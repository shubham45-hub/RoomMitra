const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function getImageUrl(path) {
  return path ? new URL(path, API_URL).toString() : "";
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data.detail;

    throw new Error(detail || `Request failed (${response.status})`);
  }

  return data;
}
