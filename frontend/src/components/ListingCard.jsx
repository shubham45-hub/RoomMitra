import PhotoGallery from "./PhotoGallery";
import ListingReaction from "./ListingReaction";
import { getImageUrl } from "../services/api";

export default function ListingCard({
  listing,
  onView,
  onContact,
  isSaved,
  onToggleSave,
  token,
  currentUserId,
  onReactionChange,
}) {
  function postedAge(value) {
    if (!value) return null;

    const postedAt = new Date(value);
    if (Number.isNaN(postedAt.getTime())) return null;

    const days = Math.max(
      0,
      // eslint-disable-next-line react-hooks/purity -- Relative age depends on the current clock.
      Math.floor((Date.now() - postedAt.getTime()) / (24 * 60 * 60 * 1000)),
    );
    if (days === 0) return "Posted today";
    if (days === 1) return "Posted 1 day ago";
    return `Posted ${days} days ago`;
  }

  const rent = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(listing.monthly_rent);
  const ageLabel = postedAge(listing.created_at);
  const peopleSharing = (listing.occupants_count ?? 0) + (listing.people_needed ?? listing.available_beds);
  const rentShare = listing.rent_basis === "WHOLE_FLAT" && peopleSharing > 0
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      .format(Math.round(listing.monthly_rent / peopleSharing))
    : null;

  return (
    <article className="listing-card">
      <div className="listing-card-media">
        <PhotoGallery
          photoUrls={listing.photo_urls || []}
          title={listing.title}
          variant="card"
        />
        <div className="listing-card-media-top">
          <span className={`availability-pill${listing.status === "FILLED" ? " is-filled" : ""}`}>
            {listing.status === "FILLED" ? "Filled" : "Available"}
          </span>
          <div className="listing-card-tags">
            <span className="listing-type">{listing.flat_type}</span>
            <span className="listing-beds">
              {listing.available_beds} {listing.available_beds === 1 ? "bed" : "beds"}
            </span>
            <span className="listing-audience-pill">
              {{ MALE: "Men", FEMALE: "Women", ANY: "Anyone" }[listing.available_for] || "Anyone"}
            </span>
          </div>
        </div>
        {listing.status === "ACTIVE" && <button
          type="button"
          className={`save-listing-button ${isSaved ? "is-saved" : ""}`}
          aria-label={isSaved ? "Remove from saved listings" : "Save listing"}
          aria-pressed={isSaved}
          onClick={() => onToggleSave(listing.id)}
        >
          {isSaved ? "♥ Saved" : "♡ Save"}
        </button>}
      </div>

      <div className="listing-card-content">
        <div className="listing-card-heading">
          <h2>{listing.title}</h2>
          <p className="listing-location">
            <span aria-hidden="true">⌖</span> {listing.locality}, {listing.city}
          </p>
          {ageLabel && (
            <p
              className={`listing-posted-age${ageLabel === "Posted 1 day ago" ? " is-yesterday" : ""}`}
            >
              {ageLabel}
            </p>
          )}
        </div>

        <div className="listing-card-stats">
          <p className="listing-view-count" aria-label={`${listing.views_last_day ?? 0} unique viewers in the last 24 hours`}>
            <span aria-hidden="true">◉</span> {listing.views_last_day ?? 0} {listing.views_last_day === 1 ? "viewer" : "viewers"} today
          </p>
          <p className="listing-contact-count">
            <span aria-hidden="true">↗</span> {listing.contacts_total ?? 0} {listing.contacts_total === 1 ? "enquiry" : "enquiries"}
          </p>
        </div>

        <p className="listing-occupancy-summary">
          <span aria-hidden="true">⌂</span>
          <strong>{listing.occupants_count ?? 0}</strong> currently living
          <span className="occupancy-divider" aria-hidden="true">·</span>
          <strong>{listing.people_needed ?? listing.available_beds}</strong> {((listing.people_needed ?? listing.available_beds) === 1) ? "person" : "people"} needed
        </p>

        <p className="listing-description">{listing.description}</p>

        <div className="listing-card-bottom">
          <div className="listing-price">
            <strong>{rent}</strong>
            <span className="rent-period"> / month{listing.rent_basis === "WHOLE_FLAT" ? " total" : " per person"}</span>
            {rentShare && <small className="listing-rent-share">≈ {rentShare} per person if split evenly</small>}
          </div>
          {listing.status === "ACTIVE" && listing.user_id !== currentUserId ? (
            <button
              type="button"
              className="owner-contact-button"
              onClick={() => onContact(listing.id)}
              aria-label={`Contact ${listing.owner_name} about ${listing.title}`}
            >
              {listing.owner_avatar_url
                ? <img className="owner-avatar owner-avatar-image" src={getImageUrl(listing.owner_avatar_url)} alt="" />
                : <span className="owner-avatar" aria-hidden="true">{(listing.owner_name || "R").charAt(0).toUpperCase()}</span>}
              <span className="owner-contact-copy">
                <strong>{listing.owner_name}</strong>
                <small>Contact lister</small>
              </span>
              <span className="owner-contact-arrow" aria-hidden="true">↗</span>
            </button>
          ) : (
            <span className="owner-name">
              {listing.owner_avatar_url
                ? <img className="owner-avatar owner-avatar-image" src={getImageUrl(listing.owner_avatar_url)} alt="" />
                : <span className="owner-avatar" aria-hidden="true">{(listing.owner_name || "R").charAt(0).toUpperCase()}</span>}
              {listing.user_id === currentUserId ? "Posted by you" : listing.owner_name}
            </span>
          )}
        </div>

        <ListingReaction listing={listing} token={token} currentUserId={currentUserId} onChanged={onReactionChange} />

        <button
          type="button"
          className="listing-details-button"
          onClick={() => onView(listing.id)}
        >
          View details <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
