import { apiRequest } from "./api";

export function getListings({
  city = "",
  flatType = "",
  locality = "",
  minRent = "",
  maxRent = "",
  minBeds = "",
} = {}) {
  const params = new URLSearchParams();

  if (city.trim()) params.set("city", city.trim());
  if (flatType.trim()) params.set("flat_type", flatType.trim());
  if (locality.trim()) params.set("locality", locality.trim());
  if (minRent) params.set("min_rent", minRent);
  if (maxRent) params.set("max_rent", maxRent);
  if (minBeds) params.set("min_beds", minBeds);

  const query = params.toString();
  return apiRequest(`/listings${query ? `?${query}` : ""}`);
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

export function getInquiryInbox(token) {
  return apiRequest("/listings/inquiries/inbox", { token });
}

export function getListing(id) {
  return apiRequest(`/listings/${id}`);
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
