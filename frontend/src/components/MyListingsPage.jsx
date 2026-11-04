import { useEffect, useState } from "react";
import {
  deleteListing,
  getMyListings,
  renewListing,
  updateListing,
} from "../services/listings";
import EditListingForm from "./EditListingForm";
import PhotoGallery from "./PhotoGallery";
import ListingReaction from "./ListingReaction";
import { ListingsFetchError, ListingsLoadingState } from "./ListingRequestState";

export default function MyListingsPage({ token, userId, onBack }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListingsError("");

    getMyListings(token)
      .then((items) => {
        if (!cancelled) setListings(items);
      })
      .catch((error) => {
        if (!cancelled) setListingsError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function toggleStatus(listing) {
    setBusyId(listing.id);
    setMessage("");

    try {
      const nextStatus = listing.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      if (listing.is_expired) {
        await renewListing(token, listing.id);
      } else {
        await updateListing(token, listing.id, { status: nextStatus });
      }
      if (await loadListings()) {
        setMessage(listing.is_expired ? "Listing renewed for 30 days and published." : `Listing ${nextStatus === "ACTIVE" ? "published" : "paused"}.`);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function markFilled(listing) {
    setBusyId(listing.id);
    setMessage("");
    try {
      await updateListing(token, listing.id, { status: "FILLED" });
      if (await loadListings()) {
        setMessage("Listing marked as filled and removed from search results.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeListing(listing) {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(listing.id);
    setMessage("");

    try {
      await deleteListing(token, listing.id);
      if (await loadListings()) {
        setMessage("Listing deleted.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
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
        {loading ? (
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
                <h2>Edit listing</h2>
                <EditListingForm
                    token={token}
                    listing={listing}
                    onCancel={() => setEditingId(null)}
                    onSaved={async () => {
                    setEditingId(null);
                    if (await loadListings()) setMessage("Listing updated.");
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
                    {listing.is_expired
                      ? listing.status === "FILLED" ? "Renew & publish" : "Renew for 30 days"
                      : listing.status === "ACTIVE" ? "Pause listing" : listing.status === "PAUSED" ? "Publish again" : "Mark available"}
                    </button>
                    {!listing.is_expired && ["ACTIVE", "PAUSED"].includes(listing.status) && (
                      <button
                        className="status-action"
                        disabled={busyId === listing.id}
                        onClick={() => markFilled(listing)}
                      >
                        Mark as filled
                      </button>
                    )}
                    <button
                    className="delete-action"
                    disabled={busyId === listing.id}
                    onClick={() => removeListing(listing)}
                    >
                    Delete
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
