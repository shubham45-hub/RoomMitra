import { useEffect, useState } from "react";
import CreateListingForm from "./CreateListingForm";
import ListingCard from "./ListingCard";
import ListingDetails from "./ListingDetails";
import ExpiryNotification from "./ExpiryNotification";
import {
  getListing,
  getListings,
  getSavedListings,
  getUnreadInquiryCount,
  recordListingView,
  removeSavedListing,
  saveListing,
} from "../services/listings";

const PAGE_SIZE = 20;

export default function ListingsPage({ token, userId, preferredCity, onProfile, onSignOut, onMyListings, onInquiries, onModeration, canModerate }) {
  const [keyword, setKeyword] = useState("");
  const [flatType, setFlatType] = useState("");
  const [listings, setListings] = useState([]);
  const [locality, setLocality] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [savedListings, setSavedListings] = useState([]);
  const [savedMode, setSavedMode] = useState(false);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);
  const visibleListings = savedMode ? savedListings : listings;

  async function viewListing(id) {
    try {
      const listing = await getListing(id, token);
      try {
        const result = await recordListingView(token, id);
        listing.views_last_day = result.views_last_day;
        setListings((current) => current.map((item) => item.id === id ? { ...item, views_last_day: result.views_last_day } : item));
        setSavedListings((current) => current.map((item) => item.id === id ? { ...item, views_last_day: result.views_last_day } : item));
      } catch {
        // Keep listing details available if view tracking is temporarily unavailable.
      }
      setSelectedListing(listing);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function search(event, overrides = {}) {
    event?.preventDefault();
    setSavedMode(false);
    setLoading(true);
    setMessage("");

    const filters = { keyword, city: preferredCity, flatType, locality, minRent, maxRent, minBeds, sort, ...overrides };
    const hasOtherFilters = [filters.keyword, filters.flatType, filters.locality, filters.minRent, filters.maxRent, filters.minBeds]
      .some((value) => String(value).trim());
    if (!String(preferredCity || "").trim() && hasOtherFilters) {
      setMessage("Set your preferred city in your profile before using the other filters.");
      setLoading(false);
      return;
    }

    try {
      const results = await getListings({
        token, ...filters,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setListings(results);
      setNextOffset(results.length);
      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateSearchFilter(name, value, currentValue, setValue) {
    setValue(value);
    const wasSet = Boolean(String(currentValue));
    const isCleared = !String(value).trim();
    if (wasSet && isCleared) void search(undefined, { [name]: "" });
  }

  useEffect(() => {
    let cancelled = false;

    getListings({ token, city: preferredCity, limit: PAGE_SIZE, offset: 0 })
      .then((items) => {
        if (!cancelled) {
          setListings(items);
          setNextOffset(items.length);
          setHasMore(items.length === PAGE_SIZE);
        }
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
  }, [token, preferredCity]);

  useEffect(() => {
    let cancelled = false;
    const refreshUnreadCount = async () => {
      try {
        const result = await getUnreadInquiryCount(token);
        if (!cancelled) setUnreadInquiryCount(result.unread_count);
      } catch {
        if (!cancelled) setUnreadInquiryCount(0);
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 30_000);
    window.addEventListener("focus", refreshUnreadCount);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadCount);
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

  async function loadMore() {
    if (loadingMore || !hasMore || savedMode) return;
    setLoadingMore(true);
    setMessage("");
    try {
      const items = await getListings({
        token, keyword, city: preferredCity, flatType, locality, minRent, maxRent, minBeds, sort,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setListings((current) => [...current, ...items]);
      setNextOffset((current) => current + items.length);
      setHasMore(items.length === PAGE_SIZE);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="browse-layout">
      <ExpiryNotification token={token} />
      {selectedListing && (
        <ListingDetails
          listing={selectedListing}
          token={token}
          currentUserId={userId}
          onContactCountChanged={(listingId, count) => {
            setListings((current) => current.map((item) => item.id === listingId ? { ...item, contacts_total: count } : item));
            setSavedListings((current) => current.map((item) => item.id === listingId ? { ...item, contacts_total: count } : item));
          }}
          onReactionChange={(listingId, reaction) => {
            setListings((current) => current.map((item) => item.id === listingId ? { ...item, ...reaction } : item));
            setSavedListings((current) => current.map((item) => item.id === listingId ? { ...item, ...reaction } : item));
            setSelectedListing((current) => current?.id === listingId ? { ...current, ...reaction } : current);
          }}
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
          <button
            className="nav-button inquiries-nav-button"
            onClick={onInquiries}
            aria-label={unreadInquiryCount ? `Inquiries, ${unreadInquiryCount} unread` : "Inquiries"}
          >
            Inquiries
            {unreadInquiryCount > 0 && (
              <span className="inquiry-unread-badge">{unreadInquiryCount > 99 ? "99+" : unreadInquiryCount}</span>
            )}
          </button>
          {canModerate && <button className="nav-button" onClick={onModeration}>Owner reports</button>}
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
        <p className="search-city-hint">Searching in <strong>{preferredCity}</strong>. Change your city in My profile.</p>

        <form className="search-panel" onSubmit={search}>
          <label>
            Search words
            <input
              type="search"
              minLength={2}
              maxLength={100}
              value={keyword}
              disabled={!preferredCity?.trim()}
              onChange={(event) => {
                updateSearchFilter("keyword", event.target.value, keyword, setKeyword);
              }}
              placeholder="Furnished, near metro…"
            />
          </label>

          <label>
            Locality
            <input disabled={!preferredCity?.trim()} value={locality} onChange={(event) => updateSearchFilter("locality", event.target.value, locality, setLocality)} placeholder="Salt Lake" />
          </label>

          <label>
            Flat type
            <input disabled={!preferredCity?.trim()} value={flatType} onChange={(event) => updateSearchFilter("flatType", event.target.value, flatType, setFlatType)} placeholder="2BHK" />
          </label>

          <label>
            Minimum rent (₹)
            <input disabled={!preferredCity?.trim()} type="number" min="1" value={minRent} onChange={(event) => updateSearchFilter("minRent", event.target.value, minRent, setMinRent)} placeholder="Any" />
          </label>

          <label>
            Maximum rent (₹)
            <input disabled={!preferredCity?.trim()} type="number" min="1" value={maxRent} onChange={(event) => updateSearchFilter("maxRent", event.target.value, maxRent, setMaxRent)} placeholder="Any" />
          </label>

          <label>
            At least this many beds
            <input disabled={!preferredCity?.trim()} type="number" min="1" max="20" value={minBeds} onChange={(event) => updateSearchFilter("minBeds", event.target.value, minBeds, setMinBeds)} placeholder="Any" />
          </label>

          <label>
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="rent_low">Lowest rent first</option>
              <option value="rent_high">Highest rent first</option>
            </select>
          </label>

          <button disabled={loading}>
            {loading ? "Searching…" : "Find a room"}
          </button>
        </form>
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div>
        <p className="eyebrow">ROOMS & FLATS</p>
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
            preferredCity={preferredCity}
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
                token={token}
                currentUserId={userId}
                onReactionChange={(listingId, reaction) => {
                  setListings((current) => current.map((item) => item.id === listingId ? { ...item, ...reaction } : item));
                  setSavedListings((current) => current.map((item) => item.id === listingId ? { ...item, ...reaction } : item));
                }}
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
        {!savedMode && !loading && listings.length > 0 && hasMore && (
          <button className="load-more-button" type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more homes…" : "Load more homes"}
          </button>
        )}
      </section>
    </div>
  );
}
