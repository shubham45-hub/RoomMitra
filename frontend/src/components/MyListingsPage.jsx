import { memo, useEffect, useState } from "react";
import {
  deleteListing,
  cacheMyListings,
  getMyListings,
  renewListing,
  updateListing,
} from "../services/listings";
import EditListingForm from "./EditListingForm";
import PhotoGallery from "./PhotoGallery";
import ListingReaction from "./ListingReaction";
import { ListingsFetchError, ListingsLoadingState } from "./ListingRequestState";

function MyListingsPage({ token, userId, onBack, active = true }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedToken, setLoadedToken] = useState(null);
  const [listingsError, setListingsError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const isLoading = loading || loadedToken !== token;

  async function loadListings(showLoading = false) {
    if (showLoading) setLoading(true);
    setListingsError("");
    try {
      setListings(await getMyListings(token));
      return true;
    } catch (error) {
      setListingsError(error.message);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }

  }

  function applyUpdatedListing(updated) {
    setListings((current) => current.map((item) => item.id === updated.id
      ? {
          ...item,
          ...updated,
          likes_count: item.likes_count,
          dislikes_count: item.dislikes_count,
          my_reaction: item.my_reaction,
        }
      : item));
  }

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    getMyListings(token)
      .then((items) => {
        if (!cancelled) {
          setListings(items);
          setListingsError("");
        }
      })
      .catch((error) => {
        if (!cancelled) setListingsError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadedToken(token);
      });

    return () => {
      cancelled = true;
    };
  }, [active, token]);

  useEffect(() => {
    if (loadedToken === token) cacheMyListings(token, listings);
  }, [listings, loadedToken, token]);

  async function toggleStatus(listing) {
    setBusyId(listing.id);
    const nextStatus = listing.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const markingAvailable = nextStatus === "ACTIVE";
    if (markingAvailable) setBusyAction({ id: listing.id, action: "available" });
    setMessage("");

    try {
      let updated;
      if (listing.is_expired) {
        updated = await renewListing(token, listing.id);
      } else {
        updated = await updateListing(token, listing.id, { status: nextStatus });
      }
      applyUpdatedListing(updated);
      setMessage(listing.is_expired
        ? "Listing renewed for 30 days and published."
        : markingAvailable ? "Mark as available is set." : "Listing paused.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function markFilled(listing) {
    setBusyId(listing.id);
    setBusyAction({ id: listing.id, action: "filled" });
    setMessage("");
    try {
      const updated = await updateListing(token, listing.id, { status: "FILLED" });
      applyUpdatedListing(updated);
      setMessage("Marked as filled. This listing is no longer shown as available.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function removeListing(listing) {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(listing.id);
    setBusyAction({ id: listing.id, action: "delete" });
    setMessage("");

    try {
      await deleteListing(token, listing.id);
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setMessage("Listing deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  return (
    <main className="my-listings-page">
      <header className="my-listings-toolbar">
        <div className="my-listings-toolbar-inner">
          <button type="button" className="back-button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to listings
          </button>
        </div>
      </header>

      <div className="my-listings-content">
        <p className="eyebrow">YOUR ROOMMITRA POSTS</p>
        <h1>My listings</h1>
        <p className="my-listings-intro">
          Manage the listings you have shared with the community.
        </p>

        {message && <p className="message" role="status">{message}</p>}
        {isLoading ? (
          <ListingsLoadingState variant="my-listings" count={4} />
        ) : (
          <>
            {listingsError && (
              <ListingsFetchError
                detail={listingsError}
                onRetry={() => void loadListings(true)}
              />
            )}

            {listings.length === 0 && !listingsError ? (
              <div className="empty-state">
                <h3>You haven’t posted a listing yet</h3>
                <p>Your listings will appear here after you publish them.</p>
              </div>
            ) : listings.length > 0 ? (
              <div className="my-listings-grid">
                {listings.map((listing) => (
            <article className="my-listing-card" key={listing.id}>
            {editingId === listing.id ? (
                <>
                <EditListingForm
                    token={token}
                    listing={listing}
                    onCancel={() => setEditingId(null)}
                    onListingChanged={(photos) => applyUpdatedListing({
                      ...listing,
                      photos,
                      photo_urls: photos.map((photo) => photo.image_url),
                    })}
                    onSaved={(updated) => {
                    setEditingId(null);
                    applyUpdatedListing(updated);
                    setMessage("Listing updated.");
                    }}
                />
                </>
            ) : (
                <>
                <PhotoGallery
                  photoUrls={listing.photo_urls || []}
                  photoCategories={(listing.photos || []).map((photo) => photo.category)}
                  title={listing.title}
                  variant="my-listing"
                />
                <div className="my-listing-heading">
                    <span className={`status-pill status-${(listing.is_expired ? "expired" : listing.status).toLowerCase()}`}>
                    {listing.is_expired ? "EXPIRED" : listing.status}
                    </span>
                    <span className="listing-type">{listing.flat_type}</span>
                </div>

                <h2>{listing.title}</h2>
                <p className="listing-location">{listing.locality}, {listing.city}</p>
                <p className="my-listing-rent">
                    ₹{Number(listing.monthly_rent).toLocaleString("en-IN")} / month
                </p>
                <p className={`listing-expiry${listing.is_expired ? " is-expired" : ""}`}>
                  {listing.is_expired
                    ? `Expired ${new Date(listing.expires_at).toLocaleDateString("en-IN")}`
                    : `Expires ${new Date(listing.expires_at).toLocaleDateString("en-IN")}`}
                </p>
                <p className="listing-view-count">
                  ◉ {listing.views_last_day ?? 0} unique {listing.views_last_day === 1 ? "viewer" : "viewers"} in the last 24 hours
                </p>
                <p className="listing-contact-count">
                  {listing.contacts_total ?? 0} {listing.contacts_total === 1 ? "person has" : "people have"} contacted you
                </p>
                <ListingReaction listing={listing} token={token} currentUserId={userId} />

                <div className="my-listing-actions">
                    <button
                    className="status-action"
                    onClick={() => setEditingId(listing.id)}
                    >
                    Edit
                    </button>
                    <button
                    className="status-action"
                    disabled={busyId === listing.id}
                    onClick={() => toggleStatus(listing)}
                    >
                    {busyAction?.id === listing.id && busyAction.action === "available" ? (
                      <span className="listing-action-label" aria-live="polite">
                        <span className="listing-action-spinner" aria-hidden="true" />
                        Setting mark as available…
                      </span>
                    ) : listing.is_expired
                      ? listing.status === "FILLED" ? "Renew & publish" : "Renew for 30 days"
                      : listing.status === "ACTIVE" ? "Pause listing" : listing.status === "PAUSED" ? "Publish again" : "Mark available"}
                    </button>
                    {!listing.is_expired && ["ACTIVE", "PAUSED"].includes(listing.status) && (
                      <button
                        className="status-action"
                        disabled={busyId === listing.id}
                        onClick={() => markFilled(listing)}
                      >
                        {busyAction?.id === listing.id && busyAction.action === "filled" ? (
                          <span className="listing-action-label" aria-live="polite">
                            <span className="listing-action-spinner" aria-hidden="true" />
                            Setting as filled…
                          </span>
                        ) : "Mark as filled"}
                      </button>
                    )}
                    <button
                    className="delete-action"
                    disabled={busyId === listing.id}
                    onClick={() => removeListing(listing)}
                    >
                    {busyAction?.id === listing.id && busyAction.action === "delete" ? (
                      <span className="listing-action-label" aria-live="polite">
                        <span className="listing-action-spinner" aria-hidden="true" />
                        Deleting…
                      </span>
                    ) : "Delete"}
                    </button>
                </div>
                </>
            )}
            </article>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

export default memo(MyListingsPage);
