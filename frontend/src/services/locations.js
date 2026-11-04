import { apiRequest } from "./api";
import { getCachedRequest } from "./requestCache";

const SUGGESTIONS_TTL = 2 * 60 * 1000;

export function getLocalitySuggestions(city, query) {
  const params = new URLSearchParams({ city, q: query });
  const key = `locations:suggestions:${city.toLowerCase()}:${query.toLowerCase()}`;
  return getCachedRequest(key, async () => {
    const result = await apiRequest(`/locations/suggestions?${params}`);
    return result.suggestions;
  }, SUGGESTIONS_TTL);
}