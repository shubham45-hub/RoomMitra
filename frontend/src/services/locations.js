import { apiRequest } from "./api";

export async function getLocalitySuggestions(city, query) {
  const params = new URLSearchParams({ city, q: query });
  const result = await apiRequest(`/locations/suggestions?${params}`);
  return result.suggestions;
}