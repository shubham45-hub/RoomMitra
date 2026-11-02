import PhotoGallery from "./PhotoGallery";

export default function ListingCard({
  listing,
  onView,
  isSaved,
  onToggleSave,
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

  return (
    <article className="listing-card">
      <PhotoGallery
        photoUrls={listing.photo_urls || []}
        title={listing.title}
        variant="card"
      />
      <div className="listing-card-top">
        <div className="listing-card-tags">
          <span className="listing-type">{listing.flat_type}</span>
          <span className="listing-beds">
            {listing.available_beds} {listing.available_beds === 1 ? "bed" : "beds"}
          </span>
        </div>

        <button
          type="button"
          className={`save-listing-button ${isSaved ? "is-saved" : ""}`}
          aria-label={isSaved ? "Remove from saved listings" : "Save listing"}
          aria-pressed={isSaved}
          onClick={() => onToggleSave(listing.id)}
        >
          {isSaved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <h2>{listing.title}</h2>
      <p className="listing-location">{listing.locality}, {listing.city}</p>
      {ageLabel && (
        <p
          className={`listing-posted-age${ageLabel === "Posted 1 day ago" ? " is-yesterday" : ""}`}
        >
          {ageLabel}
        </p>
      )}
      <p className="listing-description">{listing.description}</p>

      <div className="listing-card-bottom">
        <div>
          <strong>{rent}</strong>
          <span className="rent-period"> / month</span>
        </div>
        <span className="owner-name">by {listing.owner_name}</span>
      </div>

      <button
        type="button"
        className="listing-details-button"
        onClick={() => onView(listing.id)}
      >
        View details
      </button>
    </article>
  );
}
