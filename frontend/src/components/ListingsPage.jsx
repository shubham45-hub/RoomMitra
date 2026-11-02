import { useEffect, useState } from "react";
import CreateListingForm from "./CreateListingForm";
import ListingCard from "./ListingCard";
import ListingDetails from "./ListingDetails";
import {
  getListing,
  getListings,
  getSavedListings,
  removeSavedListing,
  saveListing,
} from "../services/listings";

export default function ListingsPage({ token, userId, onProfile, onSignOut, onMyListings, onInquiries }) {
  const [city, setCity] = useState("");
  const [flatType, setFlatType] = useState("");
  const [listings, setListings] = useState([]);
  const [locality, setLocality] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [savedListings, setSavedListings] = useState([]);
  const [savedMode, setSavedMode] = useState(false);
  const visibleListings = savedMode ? savedListings : listings;

  async function viewListing(id) {
    try {
      setSelectedListing(await getListing(id));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function search(event) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      setListings(await getListings({ city, flatType, locality, minRent, maxRent, minBeds }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getListings()
      .then((items) => {
        if (!cancelled) setListings(items);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getSavedListings(token)
      .then((items) => {
        if (!cancelled) setSavedListings(items);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function listingCreated(_listing, photoUploadMessage) {
    setShowCreate(false);
    await search();
    setMessage(photoUploadMessage || "Your listing is published.");
  }

  async function refreshSaved() {
  try {
    setSavedListings(await getSavedListings(token));
  } catch (error) {
    setMessage(error.message);
  }
}

async function toggleSave(id) {
  const alreadySaved = savedListings.some((listing) => listing.id === id);

  try {
    if (alreadySaved) {
      await removeSavedListing(token, id);
    } else {
      await saveListing(token, id);
    }
    await refreshSaved();
  } catch (error) {
    setMessage(error.message);
  }
}

  return (
    <div className="browse-layout">
      {selectedListing && (
        <ListingDetails
          listing={selectedListing}
          token={token}
          currentUserId={userId}
          onClose={() => setSelectedListing(null)}
        />
      )}

      <header className="browse-header">
        <a className="wordmark" href="#">
          <span className="wordmark-icon">R</span>
          RoomMitra
        </a>

        <nav className="browse-nav">
          <button className="nav-button" onClick={onProfile}>My profile</button>
          <button className="nav-button" onClick={onMyListings}>My listings</button>
          <button className="nav-button" onClick={onInquiries}>Inquiries</button>
          <button
            className="nav-button"
            onClick={() => setSavedMode((current) => !current)}
          >
            {savedMode ? "Browse homes" : "Saved homes"}
          </button>
          <button className="nav-button nav-signout" onClick={onSignOut}>Sign out</button>
        </nav>
      </header>

      <section className="browse-hero">
        <p className="eyebrow">ROOMMATES, MADE EASIER</p>
        <h1>Find a place<br />that feels like yours.</h1>
        <p className="browse-intro">
          Explore rooms and shared flats from people looking for a flatmate.
        </p>

        <form className="search-panel" onSubmit={search}>
          <label>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Kolkata" />
          </label>

          <label>
            Locality
            <input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Salt Lake" />
          </label>

          <label>
            Flat type
            <input value={flatType} onChange={(event) => setFlatType(event.target.value)} placeholder="2BHK" />
          </label>

          <label>
            Minimum rent (₹)
            <input type="number" min="1" value={minRent} onChange={(event) => setMinRent(event.target.value)} placeholder="Any" />
          </label>

          <label>
            Maximum rent (₹)
            <input type="number" min="1" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} placeholder="Any" />
          </label>

          <label>
            At least this many beds
            <input type="number" min="1" max="20" value={minBeds} onChange={(event) => setMinBeds(event.target.value)} placeholder="Any" />
          </label>

          <button disabled={loading}>
            {loading ? "Searching…" : "Find a room"}
          </button>
        </form>
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div>
            <p className="eyebrow">AVAILABLE HOMES</p>
            <h2>{savedMode ? "Your saved homes" : "Listings for you"}</h2>
          </div>
          <div className="results-actions">
            <span className="results-count">
              {visibleListings.length} {visibleListings.length === 1 ? "listing" : "listings"}
            </span>
            <button
              className="post-listing-button"
              onClick={() => setShowCreate((current) => !current)}
            >
              {showCreate ? "Close form" : "+ Post a listing"}
            </button>
          </div>
        </div>

        {showCreate && (
          <CreateListingForm
            token={token}
            onCreated={listingCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {message && <p className="message" role="status">{message}</p>}

        {loading ? (
          <p className="empty-state">Finding available listings…</p>
        ) : visibleListings.length ? (
          <div className="listing-grid">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={viewListing}
                isSaved={savedListings.some((saved) => saved.id === listing.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⌂</span>
            <h3>{savedMode ? "No saved listings yet" : "No listings found yet"}</h3>
            <p>{savedMode ? "Save a home you like and it will appear here." : "Try another search, or check back as new homes are added."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
