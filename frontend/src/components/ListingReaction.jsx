import { memo, useCallback, useState } from "react";
import { reactToListing } from "../services/listings";

function ListingReaction({ listing, token, currentUserId, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOwner = listing.user_id === currentUserId;
  const readOnly = isOwner || listing.status === "FILLED";

  const choose = useCallback(async (reaction) => {
    setBusy(true);
    setError("");
    try {
      onChanged?.(listing.id, await reactToListing(token, listing.id, reaction));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }, [listing.id, onChanged, token]);

  return (
    <div className={`listing-reactions${readOnly ? " is-owner" : ""}`} aria-label="Listing likes and dislikes">
      {readOnly ? (
        <>
          <span className="reaction-count is-like" aria-label={`${listing.likes_count ?? 0} likes`}>
            👍 <strong>{listing.likes_count ?? 0}</strong>
          </span>
          <span className="reaction-count is-dislike" aria-label={`${listing.dislikes_count ?? 0} dislikes`}>
            👎 <strong>{listing.dislikes_count ?? 0}</strong>
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            className={`reaction-button is-like${listing.my_reaction === "LIKE" ? " is-selected" : ""}`}
            aria-label={`${listing.my_reaction === "LIKE" ? "Remove like" : "Like"} (${listing.likes_count ?? 0})`}
            aria-pressed={listing.my_reaction === "LIKE"}
            disabled={busy}
            onClick={() => choose("LIKE")}
          >
            👍 <span>{listing.likes_count ?? 0}</span>
          </button>
          <button
            type="button"
            className={`reaction-button is-dislike${listing.my_reaction === "DISLIKE" ? " is-selected" : ""}`}
            aria-label={`${listing.my_reaction === "DISLIKE" ? "Remove dislike" : "Dislike"} (${listing.dislikes_count ?? 0})`}
            aria-pressed={listing.my_reaction === "DISLIKE"}
            disabled={busy}
            onClick={() => choose("DISLIKE")}
          >
            👎 <span>{listing.dislikes_count ?? 0}</span>
          </button>
        </>
      )}
      {error && <span className="reaction-error" role="status">{error}</span>}
    </div>
  );
}

export default memo(ListingReaction);
