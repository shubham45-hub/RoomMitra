import { apiRequest } from "./api";
import {
  getCachedRequest,
  invalidateCachedData,
  setCachedData,
  updateCachedDataByPrefix,
} from "./requestCache";

const LISTINGS_TTL = 20 * 1000;
const USER_LISTINGS_TTL = 30 * 1000;
const UNREAD_COUNT_TTL = 10 * 1000;
const MODERATION_TTL = 15 * 1000;

const userCacheKey = (resource, token) => `listings:${resource}:${token}:`;

function patchListingCache(token, id, updates) {
  const prefixes = [
    `listings:feed:${token}:`,
    userCacheKey("detail", token),
    userCacheKey("mine", token),
    userCacheKey("saved", token),
  ];
  for (const prefix of prefixes) {
    updateCachedDataByPrefix(prefix, (data) => {
      if (Array.isArray(data)) {
        return data.map((item) => item?.id === id ? { ...item, ...updates } : item);
      }
      return data?.id === id ? { ...data, ...updates } : data;
    });
  }
}

function invalidateListingViews(token) {
  invalidateCachedData(`listings:feed:${token}:`);
  invalidateCachedData(userCacheKey("mine", token));
  invalidateCachedData(userCacheKey("saved", token));
  invalidateCachedData(userCacheKey("detail", token));
}

export function getListings({
  token,
  keyword = "",
  city = "",
  flatType = "",
  locality = "",
  minRent = "",
  maxRent = "",
  minBeds = "",
  furnishingStatus = "",
  availability = "",
  sort = "newest",
  limit = 20,
  offset = 0,
  onTotalCount,
} = {}) {
  const params = new URLSearchParams();

  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (city.trim()) params.set("city", city.trim());
  if (flatType.trim()) params.set("flat_type", flatType.trim());
  if (locality.trim()) params.set("locality", locality.trim());
  if (minRent) params.set("min_rent", minRent);
  if (maxRent) params.set("max_rent", maxRent);
  if (minBeds) params.set("min_beds", minBeds);
  if (furnishingStatus) params.set("furnishing_status", furnishingStatus);
  if (availability) params.set("availability", availability);
  params.set("sort", sort);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const query = params.toString();
  const key = `listings:feed:${token || "public"}:${query}`;
  return getCachedRequest(key, async () => {
    let totalCount = null;
    const items = await apiRequest(`/listings${query ? `?${query}` : ""}`, {
      token,
      onResponse: (response) => {
        const headerValue = response.headers.get("X-Total-Count");
        if (headerValue !== null) {
          const total = Number(headerValue);
          if (Number.isFinite(total)) totalCount = total;
        }
      },
    });
    return { items, totalCount };
  }, LISTINGS_TTL).then(({ items, totalCount }) => {
    if (totalCount !== null) onTotalCount?.(totalCount);
    return items;
  });
}

export async function createListing(token, listing) {
  const created = await apiRequest("/listings", {
    token,
    method: "POST",
    body: JSON.stringify(listing),
  });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return created;
}

export async function uploadListingImages(token, id, files) {
  const body = new FormData();
  files.forEach((photo) => {
    body.append("files", photo.file || photo);
    body.append("categories", photo.category || "OTHER");
  });
  const result = await apiRequest(`/listings/${id}/images`, {
    token,
    method: "POST",
    body,
  });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return result;
}

export async function deleteListingImage(token, listingId, imageId) {
  const result = await apiRequest(`/listings/${listingId}/images/${imageId}`, {
    token,
    method: "DELETE",
  });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return result;
}

export async function sendListingInquiry(token, listingId, inquiry) {
  const result = await apiRequest(`/listings/${listingId}/inquiries`, {
    token,
    method: "POST",
    body: JSON.stringify(inquiry),
  });
  patchListingCache(token, listingId, { contacts_total: result.contacts_total });
  invalidateCachedData(userCacheKey("unread-count", token));
  return result;
}

export async function reportListing(token, listingId, report) {
  const result = await apiRequest(`/listings/${listingId}/reports`, {
    token,
    method: "POST",
    body: JSON.stringify(report),
  });
  invalidateCachedData(`listings:moderation:${token}:`);
  return result;
}

export function getModerationAccess(token) {
  return getCachedRequest(`listings:moderation-access:${token}`, () => apiRequest("/moderation/access", { token }), 60 * 1000);
}

export function getModerationReports(token, status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const key = `listings:moderation:${token}:${status}`;
  return getCachedRequest(key, () => apiRequest(`/moderation/reports${query}`, { token }), MODERATION_TTL);
}

export async function updateModerationReport(token, id, updates) {
  const result = await apiRequest(`/moderation/reports/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  invalidateCachedData(`listings:moderation:${token}:`);
  invalidateCachedData(`listings:feed:${token}:`);
  invalidateCachedData(userCacheKey("saved", token));
  invalidateCachedData(userCacheKey("detail", token));
  return result;
}

export async function getInquiryInbox(token) {
  const inbox = await apiRequest("/listings/inquiries/inbox", { token });
  invalidateCachedData(userCacheKey("unread-count", token));
  return inbox;
}

export function getUnreadInquiryCount(token) {
  return getCachedRequest(
    userCacheKey("unread-count", token),
    () => apiRequest("/listings/inquiries/unread-count", { token }),
    UNREAD_COUNT_TTL,
  );
}

export function getListing(id, token) {
  const key = `${userCacheKey("detail", token)}${id}`;
  return getCachedRequest(key, () => apiRequest(`/listings/${id}`, { token }), LISTINGS_TTL);
}

export async function reactToListing(token, id, reaction) {
  const result = await apiRequest(`/listings/${id}/reaction`, {
    token,
    method: "POST",
    body: JSON.stringify({ reaction }),
  });
  patchListingCache(token, id, result);
  return result;
}

export async function recordListingView(token, id) {
  const result = await apiRequest(`/listings/${id}/view`, { token, method: "POST" });
  patchListingCache(token, id, { views_last_day: result.views_last_day });
  return result;
}

export async function recordListingContact(token, id, method) {
  const result = await apiRequest(`/listings/${id}/contact-actions`, {
    token,
    method: "POST",
    body: JSON.stringify({ method }),
    keepalive: true,
  });
  patchListingCache(token, id, { contacts_total: result.contacts_total });
  return result;
}

export function getListingContact(token, id) {
  return apiRequest(`/listings/${id}/contact`, { token });
}

export function getMyListings(token) {
  return getCachedRequest(
    userCacheKey("mine", token),
    () => apiRequest("/listings/mine", { token }),
    USER_LISTINGS_TTL,
  );
}

export function cacheMyListings(token, listings) {
  setCachedData(userCacheKey("mine", token), listings, USER_LISTINGS_TTL);
}

export async function updateListing(token, id, updates) {
  const result = await apiRequest(`/listings/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return result;
}

export async function renewListing(token, id) {
  const result = await apiRequest(`/listings/${id}/renew`, { token, method: "POST" });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return result;
}

export async function deleteListing(token, id) {
  const result = await apiRequest(`/listings/${id}`, {
    token,
    method: "DELETE",
  });
  invalidateListingViews(token);
  invalidateCachedData("locations:suggestions:");
  return result;
}

export function getSavedListings(token) {
  return getCachedRequest(
    userCacheKey("saved", token),
    () => apiRequest("/listings/saved", { token }),
    USER_LISTINGS_TTL,
  );
}

export function cacheSavedListings(token, listings) {
  setCachedData(userCacheKey("saved", token), listings, USER_LISTINGS_TTL);
}

export async function saveListing(token, id) {
  const result = await apiRequest(`/listings/${id}/save`, {
    token,
    method: "POST",
  });
  invalidateCachedData(userCacheKey("saved", token));
  return result;
}

export async function removeSavedListing(token, id) {
  const result = await apiRequest(`/listings/${id}/save`, {
    token,
    method: "DELETE",
  });
  invalidateCachedData(userCacheKey("saved", token));
  return result;
}

export function getSavedListingsCacheKey(token) {
  return userCacheKey("saved", token);
}
