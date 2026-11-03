import { useEffect, useState } from "react";
import CreateListingForm from "./CreateListingForm";
import ListingCard from "./ListingCard";
import ListingDetails from "./ListingDetails";
import ExpiryNotification from "./ExpiryNotification";
import SiteFooter from "./SiteFooter";
import { getImageUrl } from "../services/api";
import {
  getListing,
  getListingContact,
  getListings,
  getSavedListings,
  getUnreadInquiryCount,
  recordListingView,
  removeSavedListing,
  saveListing,
} from "../services/listings";

const PAGE_SIZE = 20;

function describeResults(filters, city) {
  const parts = [];
  const keyword = filters.keyword?.trim();
  const locality = filters.locality?.trim();
  const flatType = filters.flatType?.trim();
  if (keyword) parts.push(`results for ${keyword}`);
  if (locality) parts.push(`in ${locality}${city ? `, ${city}` : ""}`);
  if (flatType) parts.push(`for ${flatType}`);
  if (filters.minRent && filters.maxRent) parts.push(`between ₹${filters.minRent} and ₹${filters.maxRent} rent`);
  else if (filters.minRent) parts.push(`with rent from ₹${filters.minRent}`);
  else if (filters.maxRent) parts.push(`with rent up to ₹${filters.maxRent}`);
  if (filters.minBeds) parts.push(`with at least ${filters.minBeds} ${filters.minBeds === "1" ? "bed" : "beds"}`);
  if (filters.furnishingStatus) {
    const furnishing = { FURNISHED: "furnished", SEMI_FURNISHED: "semi-furnished", UNFURNISHED: "unfurnished" }[filters.furnishingStatus];
    parts.push(`${furnishing}`);
  }
  if (filters.availability === "AVAILABLE") parts.push("currently available");
  if (filters.availability === "FILLED") parts.push("already filled");
  if (!parts.length) return "";
  if (!keyword && !locality && !flatType) return `Showing listings ${parts.join(" ")}`;
  return `Showing ${parts.join(" ")}`;
}

export default function ListingsPage({ token, userId, profile, preferredCity, onProfile, onSignOut, onMyListings, onInquiries, onModeration, onPublicPage, canModerate }) {
  const [keyword, setKeyword] = useState("");
  const [flatType, setFlatType] = useState("");
  const [listings, setListings] = useState([]);
  const [totalListingCount, setTotalListingCount] = useState(0);
  const [locality, setLocality] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [furnishingStatus, setFurnishingStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const [sort, setSort] = useState("newest");
  const [appliedFilters, setAppliedFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [contactFirst, setContactFirst] = useState(false);
  const [contactLaunch, setContactLaunch] = useState(null);
  const [savedListings, setSavedListings] = useState([]);
  const [savedMode, setSavedMode] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);
  const visibleListings = savedMode ? savedListings : listings;
  const hasActiveFilters = Boolean(
    keyword.trim() || flatType.trim() || locality.trim() || minRent || maxRent || minBeds ||
    furnishingStatus || availability || sort !== "newest",
  );
  const isFilterApplied = (key, value) => Boolean(
    appliedFilters[key] && String(appliedFilters[key]) === String(value) &&
    !(key === "sort" && value === "newest"),
  );
  const appliedFilterItems = [
    { key: "keyword", label: `Search: ${appliedFilters.keyword}`, value: appliedFilters.keyword, setter: setKeyword, resetValue: "" },
    { key: "locality", label: `Locality: ${appliedFilters.locality}`, value: appliedFilters.locality, setter: setLocality, resetValue: "" },
    { key: "flatType", label: `Flat type: ${appliedFilters.flatType}`, value: appliedFilters.flatType, setter: setFlatType, resetValue: "" },
    { key: "minRent", label: `Min rent: ₹${appliedFilters.minRent}`, value: appliedFilters.minRent, setter: setMinRent, resetValue: "" },
    { key: "maxRent", label: `Max rent: ₹${appliedFilters.maxRent}`, value: appliedFilters.maxRent, setter: setMaxRent, resetValue: "" },
    { key: "minBeds", label: `At least ${appliedFilters.minBeds} beds`, value: appliedFilters.minBeds, setter: setMinBeds, resetValue: "" },
    { key: "furnishingStatus", label: `Furnishing: ${{ FURNISHED: "Furnished", SEMI_FURNISHED: "Semi-furnished", UNFURNISHED: "Unfurnished" }[appliedFilters.furnishingStatus]}`, value: appliedFilters.furnishingStatus, setter: setFurnishingStatus, resetValue: "" },
    { key: "availability", label: `Availability: ${{ AVAILABLE: "Available", FILLED: "Filled" }[appliedFilters.availability]}`, value: appliedFilters.availability, setter: setAvailability, resetValue: "" },
    { key: "sort", label: `Sort: ${{ rent_low: "Lowest rent", rent_high: "Highest rent" }[appliedFilters.sort]}`, value: appliedFilters.sort === "newest" ? "" : appliedFilters.sort, setter: setSort, resetValue: "newest" },
  ].filter((filter) => filter.value);
  const resultsContext = describeResults(appliedFilters, preferredCity?.trim());
  const resultsCountLabel = savedMode
    ? `${visibleListings.length} saved ${visibleListings.length === 1 ? "listing" : "listings"}`
    : listings.length < totalListingCount
      ? `Showing ${listings.length} of ${totalListingCount} listings`
      : `${totalListingCount} ${totalListingCount === 1 ? "listing" : "listings"}`;

  useEffect(() => {
    function updateBackToTopVisibility() {
      setShowBackToTop(window.scrollY > 600);
    }
    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);

  async function viewListing(id, openContactFirst = false) {
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
      let directContact = null;
      let directContactError = "";
      if (openContactFirst && listing.status === "ACTIVE" && listing.user_id !== userId) {
        try {
          directContact = await getListingContact(token, id);
        } catch (error) {
          directContactError = error.message;
        }
      }
      setSelectedListing(listing);
      setContactFirst(openContactFirst);
      setContactLaunch(openContactFirst ? { ownerContact: directContact, contactError: directContactError } : null);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function search(event, overrides = {}) {
    event?.preventDefault();
    setSavedMode(false);
    setLoading(true);
    setMessage("");

    const filters = { keyword, city: preferredCity, flatType, locality, minRent, maxRent, minBeds, furnishingStatus, availability, sort, ...overrides };
    const hasOtherFilters = [filters.keyword, filters.flatType, filters.locality, filters.minRent, filters.maxRent, filters.minBeds, filters.furnishingStatus, filters.availability]
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
        onTotalCount: setTotalListingCount,
      });
      setListings(results);
      setNextOffset(results.length);
      setHasMore(results.length === PAGE_SIZE);
      setAppliedFilters({
        keyword: filters.keyword,
        flatType: filters.flatType,
        locality: filters.locality,
        minRent: filters.minRent,
        maxRent: filters.maxRent,
        minBeds: filters.minBeds,
        furnishingStatus: filters.furnishingStatus,
        availability: filters.availability,
        sort: filters.sort,
      });
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

  function clearFilters() {
    setKeyword("");
    setFlatType("");
    setLocality("");
    setMinRent("");
    setMaxRent("");
    setMinBeds("");
    setFurnishingStatus("");
    setAvailability("");
    setSort("newest");
    void search(undefined, {
      keyword: "",
      flatType: "",
      locality: "",
      minRent: "",
      maxRent: "",
      minBeds: "",
      furnishingStatus: "",
      availability: "",
      sort: "newest",
    });
  }

  useEffect(() => {
    let cancelled = false;

    getListings({
      token,
      city: preferredCity,
      limit: PAGE_SIZE,
      offset: 0,
      onTotalCount: (count) => { if (!cancelled) setTotalListingCount(count); },
    })
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
        token, keyword, city: preferredCity, flatType, locality, minRent, maxRent, minBeds, furnishingStatus, availability, sort,
        limit: PAGE_SIZE,
        offset: nextOffset,
        onTotalCount: setTotalListingCount,
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
          focusContact={contactFirst}
          initialOwnerContact={contactLaunch?.ownerContact || null}
          initialContactError={contactLaunch?.contactError || ""}
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
          onClose={() => { setSelectedListing(null); setContactFirst(false); setContactLaunch(null); }}
        />
      )}

      <header className="browse-header">
        <a className="wordmark" href="#">
          <span className="wordmark-icon">R</span>
          RoomMitra
        </a>

        <nav className="browse-nav">
          <button className="nav-button profile-nav-button" onClick={onProfile}>
            {profile?.avatar_url
              ? <img className="profile-nav-avatar" src={getImageUrl(profile.avatar_url)} alt="" />
              : <span className="profile-nav-avatar profile-nav-avatar-fallback" aria-hidden="true">{profile?.name?.trim()?.charAt(0)?.toUpperCase() || "R"}</span>}
            <span>My profile</span>
          </button>
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
          <label className={isFilterApplied("keyword", keyword) ? "filter-applied" : ""}>
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

          <label className={isFilterApplied("locality", locality) ? "filter-applied" : ""}>
            Locality
            <input disabled={!preferredCity?.trim()} value={locality} onChange={(event) => updateSearchFilter("locality", event.target.value, locality, setLocality)} placeholder="Salt Lake" />
          </label>

          <label className={isFilterApplied("flatType", flatType) ? "filter-applied" : ""}>
            Flat type
            <input disabled={!preferredCity?.trim()} value={flatType} onChange={(event) => updateSearchFilter("flatType", event.target.value, flatType, setFlatType)} placeholder="2BHK" />
          </label>

          <label className={isFilterApplied("minRent", minRent) ? "filter-applied" : ""}>
            Minimum rent (₹)
            <input disabled={!preferredCity?.trim()} type="number" min="1" value={minRent} onChange={(event) => updateSearchFilter("minRent", event.target.value, minRent, setMinRent)} placeholder="Any" />
          </label>

          <label className={isFilterApplied("maxRent", maxRent) ? "filter-applied" : ""}>
            Maximum rent (₹)
            <input disabled={!preferredCity?.trim()} type="number" min="1" value={maxRent} onChange={(event) => updateSearchFilter("maxRent", event.target.value, maxRent, setMaxRent)} placeholder="Any" />
          </label>

          <label className={isFilterApplied("minBeds", minBeds) ? "filter-applied" : ""}>
            At least this many beds
            <input disabled={!preferredCity?.trim()} type="number" min="1" max="20" value={minBeds} onChange={(event) => updateSearchFilter("minBeds", event.target.value, minBeds, setMinBeds)} placeholder="Any" />
          </label>

          <label className={isFilterApplied("furnishingStatus", furnishingStatus) ? "filter-applied" : ""}>
            Furnishing
            <select
              value={furnishingStatus}
              disabled={!preferredCity?.trim()}
              onChange={(event) => updateSearchFilter("furnishingStatus", event.target.value, furnishingStatus, setFurnishingStatus)}
            >
              <option value="">Any furnishing</option>
              <option value="FURNISHED">Furnished</option>
              <option value="SEMI_FURNISHED">Semi-furnished</option>
              <option value="UNFURNISHED">Unfurnished</option>
            </select>
          </label>

          <label className={isFilterApplied("availability", availability) ? "filter-applied" : ""}>
            Availability
            <select
              value={availability}
              disabled={!preferredCity?.trim()}
              onChange={(event) => updateSearchFilter("availability", event.target.value, availability, setAvailability)}
            >
              <option value="">Available and filled</option>
              <option value="AVAILABLE">Available only</option>
              <option value="FILLED">Filled only</option>
            </select>
          </label>

          <label className={isFilterApplied("sort", sort) ? "filter-applied" : ""}>
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="rent_low">Lowest rent first</option>
              <option value="rent_high">Highest rent first</option>
            </select>
          </label>

          {hasActiveFilters && (
            <button type="button" className="clear-filters-button" onClick={clearFilters} disabled={loading}>
              Clear filters
            </button>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Find a room"}
          </button>
        </form>
        {appliedFilterItems.length > 0 && (
          <div className="applied-filters" aria-label="Applied filters">
            <span>Applied</span>
            {appliedFilterItems.map((filter) => (
              <button
                type="button"
                className="applied-filter-chip"
                key={filter.key}
                aria-label={`Remove filter ${filter.label}`}
                onClick={() => {
                  filter.setter(filter.resetValue);
                  void search(undefined, { [filter.key]: filter.resetValue });
                }}
              >
                {filter.label}<span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div>
        <p className="eyebrow">ROOMS & FLATS</p>
            <h2>{savedMode ? "Your saved homes" : "Listings for you"}</h2>
            {!savedMode && resultsContext && <p className="results-context">{resultsContext}</p>}
          </div>
          <div className="results-actions">
            <span className="results-count">
              {resultsCountLabel}
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
            profileSex={profile?.sex}
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
                onContact={(listingId) => viewListing(listingId, true)}
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
            <h3>
              {savedMode
                ? "No saved listings yet"
                : appliedFilterItems.length
                  ? "No listings match these filters"
                  : "No listings found yet"}
            </h3>
            <p>
              {savedMode
                ? "Save a home you like and it will appear here."
                : appliedFilterItems.length
                  ? "Try removing a filter or clear all filters to see more homes."
                  : "Check back as new homes are added in your city."}
            </p>
            {!savedMode && appliedFilterItems.length > 0 && (
              <button type="button" className="clear-empty-filters" onClick={clearFilters} disabled={loading}>
                Clear all filters
              </button>
            )}
          </div>
        )}
        {!savedMode && !loading && listings.length > 0 && hasMore && (
          <button className="load-more-button" type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more homes…" : "Load more homes"}
          </button>
        )}
      </section>
      <SiteFooter onNavigate={onPublicPage} />
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top-button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <span aria-hidden="true">↑</span> Back to top
        </button>
      )}
    </div>
  );
}
