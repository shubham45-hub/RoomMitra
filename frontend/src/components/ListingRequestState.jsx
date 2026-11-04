import { useEffect, useState } from "react";

const searchLoadingMessages = [
  "Finding places that feel like home",
  "Checking the latest rooms in your city",
  "Matching homes to your search",
];
const myListingsLoadingMessages = [
  "Getting your posts ready",
  "Checking the latest updates",
  "Almost there — your listings are on the way",
];

function ListingCardSkeleton() {
  return (
    <article className="listing-skeleton-card" aria-hidden="true">
      <div className="skeleton-shimmer listing-skeleton-photo" />
      <div className="listing-skeleton-content">
        <div className="skeleton-shimmer skeleton-line skeleton-title" />
        <div className="skeleton-shimmer skeleton-line skeleton-location" />
        <div className="listing-skeleton-pills">
          <span className="skeleton-shimmer skeleton-pill" />
          <span className="skeleton-shimmer skeleton-pill short" />
        </div>
        <div className="skeleton-shimmer skeleton-line skeleton-description" />
        <div className="skeleton-shimmer skeleton-line skeleton-description second" />
        <div className="listing-skeleton-footer">
          <span className="skeleton-shimmer skeleton-price" />
          <span className="skeleton-shimmer skeleton-avatar" />
        </div>
        <span className="skeleton-shimmer skeleton-action" />
      </div>
    </article>
  );
}

export function ListingsLoadingState({ count = 4, compact = false, variant = "search" }) {
  const isMyListings = variant === "my-listings";
  const messages = isMyListings ? myListingsLoadingMessages : searchLoadingMessages;
  const messageCount = messages.length;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messageCount);
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, [messageCount]);

  return (
    <div
      className={`listings-loading-state${compact ? " is-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="listings-loading-copy">
        <span className="loading-indicator" aria-hidden="true"><span /></span>
        <div>
          <p className="loading-kicker">{isMyListings ? "YOUR POSTS ARE LOADING" : "ROOMMITRA IS SEARCHING"}</p>
          <h3 key={messageIndex}>{messages[messageIndex]}</h3>
          {!compact && (
            <p>
              {isMyListings
                ? "Loading the rooms and flats you have shared with the community."
                : "Getting the newest rooms and shared flats ready for you."}
            </p>
          )}
        </div>
      </div>
      <div className="listing-grid listing-skeleton-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => <ListingCardSkeleton key={index} />)}
      </div>
    </div>
  );
}

export function ListingsFetchError({ onRetry, detail = "" }) {
  return (
    <div className="listings-fetch-error" role="alert">
      <span className="fetch-error-icon" aria-hidden="true">↻</span>
      <div className="fetch-error-copy">
        <h3>We couldn’t load the listings</h3>
        <p>RoomMitra is having trouble reaching the server. Check your connection and try again.</p>
        {detail && <small>{detail}</small>}
      </div>
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}
