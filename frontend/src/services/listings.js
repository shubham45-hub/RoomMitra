import { apiRequest } from "./api";

export function getListings({
  token,
  keyword = "",
  city = "",
  flatType = "",
  locality = "",
  minRent = "",
  maxRent = "",
  minBeds = "",
  sort = "newest",
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();

  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (city.trim()) params.set("city", city.trim());
  if (flatType.trim()) params.set("flat_type", flatType.trim());
  if (locality.trim()) params.set("locality", locality.trim());
  if (minRent) params.set("min_rent", minRent);
  if (maxRent) params.set("max_rent", maxRent);
  if (minBeds) params.set("min_beds", minBeds);
  params.set("sort", sort);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const query = params.toString();
  return apiRequest(`/listings${query ? `?${query}` : ""}`, { token });
}

export function createListing(token, listing) {
  return apiRequest("/listings", {
    token,
    method: "POST",
    body: JSON.stringify(listing),
  });
}

export function uploadListingImages(token, id, files) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  return apiRequest(`/listings/${id}/images`, {
    token,
    method: "POST",
    body,
  });
}

export function deleteListingImage(token, listingId, imageId) {
  return apiRequest(`/listings/${listingId}/images/${imageId}`, {
    token,
    method: "DELETE",
  });
}

export function sendListingInquiry(token, listingId, inquiry) {
  return apiRequest(`/listings/${listingId}/inquiries`, {
    token,
    method: "POST",
    body: JSON.stringify(inquiry),
  });
}

export function reportListing(token, listingId, report) {
  return apiRequest(`/listings/${listingId}/reports`, {
    token,
    method: "POST",
    body: JSON.stringify(report),
  });
}

export function getModerationAccess(token) {
  return apiRequest("/moderation/access", { token });
}

export function getModerationReports(token, status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest(`/moderation/reports${query}`, { token });
}

export function updateModerationReport(token, id, updates) {
  return apiRequest(`/moderation/reports/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function getInquiryInbox(token) {
  return apiRequest("/listings/inquiries/inbox", { token });
}

export function getUnreadInquiryCount(token) {
  return apiRequest("/listings/inquiries/unread-count", { token });
}

export function getListing(id, token) {
  return apiRequest(`/listings/${id}`, { token });
}

export function reactToListing(token, id, reaction) {
  return apiRequest(`/listings/${id}/reaction`, {
    token,
    method: "POST",
    body: JSON.stringify({ reaction }),
  });
}

export function recordListingView(token, id) {
  return apiRequest(`/listings/${id}/view`, { token, method: "POST" });
}

export function recordListingContact(token, id, method) {
  return apiRequest(`/listings/${id}/contact-actions`, {
    token,
    method: "POST",
    body: JSON.stringify({ method }),
    keepalive: true,
  });
}

export function getListingContact(token, id) {
  return apiRequest(`/listings/${id}/contact`, { token });
}

export function getMyListings(token) {
  return apiRequest("/listings/mine", { token });
}

export function updateListing(token, id, updates) {
  return apiRequest(`/listings/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function renewListing(token, id) {
  return apiRequest(`/listings/${id}/renew`, { token, method: "POST" });
}

export function deleteListing(token, id) {
  return apiRequest(`/listings/${id}`, {
    token,
    method: "DELETE",
  });
}

export function getSavedListings(token) {
  return apiRequest("/listings/saved", { token });
}

export function saveListing(token, id) {
  return apiRequest(`/listings/${id}/save`, {
    token,
    method: "POST",
  });
}

export function removeSavedListing(token, id) {
  return apiRequest(`/listings/${id}/save`, {
    token,
    method: "DELETE",
  });
}
