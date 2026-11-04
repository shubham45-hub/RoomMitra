import { memo, useEffect, useState } from "react";
import { getMyListings, renewListing } from "../services/listings";

const DISMISSED_KEY = "roommitra_expiry_notice_dismissed";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function ExpiryNotification({ token, active = true }) {
  const [expiringListings, setExpiringListings] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active) return undefined;
    if (sessionStorage.getItem(DISMISSED_KEY)) return undefined;
    let cancelled = false;

    getMyListings(token)
      .then((listings) => {
        if (cancelled) return;
        const now = Date.now();
        setExpiringListings(listings.flatMap((listing) => {
          if (listing.status === "FILLED" || listing.is_expired) return [];
          const remaining = new Date(listing.expires_at).getTime() - now;
          if (remaining <= 0 || remaining > FIVE_DAYS_MS) return [];
          return [{
            ...listing,
            days_left: Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000))),
          }];
        }));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [active, token]);

  useEffect(() => {
    if (!expiringListings.length) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expiringListings.length]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setExpiringListings([]);
  }

  async function renew(listing) {
    setBusyId(listing.id);
    setMessage("");
    try {
      await renewListing(token, listing.id);
      setExpiringListings((current) => current.filter((item) => item.id !== listing.id));
      setMessage(`“${listing.title}” has been renewed for 30 days.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!expiringListings.length) return null;

  return (
    <div className="expiry-notice-overlay">
      <section
        className="expiry-notice-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="expiry-notice-title"
        aria-describedby="expiry-notice-description"
      >
        <button className="expiry-notice-close" type="button" onClick={dismiss} aria-label="Dismiss expiry notice">×</button>
        <span className="expiry-notice-icon" aria-hidden="true">!</span>
        <p className="eyebrow">LISTING REMINDER</p>
        <h2 id="expiry-notice-title">Your listing is expiring soon</h2>
        <p id="expiry-notice-description" className="expiry-notice-description">
          These listings will leave search results when they expire. Renew any that are still available.
        </p>
        <div className="expiry-notice-list">
          {expiringListings.map((listing) => (
              <article className="expiry-notice-item" key={listing.id}>
                <div>
                  <strong>{listing.title}</strong>
                  <span>{listing.locality}, {listing.city}</span>
                  <small>Expires in {listing.days_left} {listing.days_left === 1 ? "day" : "days"}</small>
                </div>
                <button type="button" disabled={busyId === listing.id} onClick={() => renew(listing)}>
                  {busyId === listing.id ? "Renewing…" : "Renew"}
                </button>
              </article>
          ))}
        </div>
        {message && <p className="expiry-notice-message" role="status">{message}</p>}
        <button className="expiry-notice-dismiss" type="button" onClick={dismiss}>Remind me later</button>
      </section>
    </div>
  );
}

export default memo(ExpiryNotification);
