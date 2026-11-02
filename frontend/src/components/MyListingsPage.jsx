import { useEffect, useState } from "react";
import {
  deleteListing,
  getMyListings,
  updateListing,
} from "../services/listings";
import EditListingForm from "./EditListingForm";
import PhotoGallery from "./PhotoGallery";

export default function MyListingsPage({ token, onBack }) {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  async function loadListings() {
    try {
      setListings(await getMyListings(token));
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getMyListings(token)
      .then((items) => {
        if (!cancelled) setListings(items);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
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
      await updateListing(token, listing.id, { status: nextStatus });
      await loadListings();
      setMessage(`Listing ${nextStatus === "ACTIVE" ? "published" : "paused"}.`);
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
      await loadListings();
      setMessage("Listing deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="my-listings-page">
      <button className="back-button" onClick={onBack}>
        ← Back to listings
      </button>

      <p className="eyebrow">YOUR ROOMMITRA POSTS</p>
      <h1>My listings</h1>
      <p className="my-listings-intro">
        Manage the listings you have shared with the community.
      </p>

      {message && <p className="message" role="status">{message}</p>}

      {listings.length === 0 ? (
        <div className="empty-state">
          <h3>You haven’t posted a listing yet</h3>
          <p>Your listings will appear here after you publish them.</p>
        </div>
      ) : (
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
                    await loadListings();
                    setMessage("Listing updated.");
                    }}
                />
                </>
            ) : (
                <>
                <PhotoGallery
                  photoUrls={listing.photo_urls || []}
                  title={listing.title}
                  variant="my-listing"
                />
                <div className="my-listing-heading">
                    <span className={`status-pill status-${listing.status.toLowerCase()}`}>
                    {listing.status}
                    </span>
                    <span className="listing-type">{listing.flat_type}</span>
                </div>

                <h2>{listing.title}</h2>
                <p className="listing-location">{listing.locality}, {listing.city}</p>
                <p className="my-listing-rent">
                    ₹{Number(listing.monthly_rent).toLocaleString("en-IN")} / month
                </p>

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
                    {listing.status === "ACTIVE" ? "Pause listing" : "Publish again"}
                    </button>
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
      )}
    </main>
  );
}
