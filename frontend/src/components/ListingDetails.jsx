import { useState } from "react";
import PhotoGallery from "./PhotoGallery";
import ListingReaction from "./ListingReaction";
import { getListingContact, recordListingContact, reportListing, sendListingInquiry } from "../services/listings";

export default function ListingDetails({ listing, token, currentUserId, onClose, onContactCountChanged, onReactionChange }) {
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [contactError, setContactError] = useState("");
  const [loadingContact, setLoadingContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("SCAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [contactCount, setContactCount] = useState(listing.contacts_total ?? 0);
  const rupees = (amount) =>
    amount == null
      ? "Not specified"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amount);

  async function submitInquiry(event) {
    event.preventDefault();
    setBusy(true);
    setInquiryStatus("");
    try {
      const result = await sendListingInquiry(token, listing.id, {
        message: inquiryMessage,
        share_phone: sharePhone,
      });
      setInquiryMessage("");
      setSharePhone(false);
      setShowInquiry(false);
      setInquiryStatus(result.message);
      setContactCount(result.contacts_total);
      onContactCountChanged?.(listing.id, result.contacts_total);
    } catch (error) {
      setInquiryStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function revealContact() {
    setLoadingContact(true);
    setContactError("");
    try {
      setOwnerContact(await getListingContact(token, listing.id));
    } catch (error) {
      setContactError(error.message);
    } finally {
      setLoadingContact(false);
    }
  }

  async function trackContact(method) {
    try {
      const result = await recordListingContact(token, listing.id, method);
      setContactCount(result.contacts_total);
      onContactCountChanged?.(listing.id, result.contacts_total);
    } catch {
      // Contact links remain usable if analytics recording is temporarily unavailable.
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    setReportBusy(true);
    setReportStatus("");
    try {
      const result = await reportListing(token, listing.id, {
        reason: reportReason,
        details: reportDetails,
      });
      setReportStatus(result.message);
      setReportDetails("");
      setShowReport(false);
    } catch (error) {
      setReportStatus(error.message);
    } finally {
      setReportBusy(false);
    }
  }

  const ownerPhoneDigits = ownerContact?.phone.replace(/\D/g, "");
  const directWhatsappMessage = encodeURIComponent(
    `Hi ${ownerContact?.owner_name}, I found your listing “${listing.title}” on RoomMitra. Is it still available?`,
  );

  return (
    <div className="detail-overlay" onMouseDown={onClose}>
      <article
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="detail-heading">
          <span className="detail-eyebrow">ROOMMITRA LISTING</span>
          <span className={`availability-pill${listing.status === "FILLED" ? " is-filled" : ""}`}>
            {listing.status === "FILLED" ? "Filled" : "Available"}
          </span>
          <span className="listing-type">{listing.flat_type}</span>
          <h2 id="detail-title">{listing.title}</h2>
          <p className="listing-location detail-location">
            <span aria-hidden="true">⌖</span>
            {listing.locality}, {listing.city}
            {listing.pincode ? ` · ${listing.pincode}` : ""}
          </p>
        </div>

        <PhotoGallery
          photoUrls={listing.photo_urls || []}
          title={listing.title}
          variant="details"
        />

        <ListingReaction listing={listing} token={token} currentUserId={currentUserId} onChanged={onReactionChange} />

        <div className="detail-price-card">
          <div className="detail-rent">
            <span>Monthly rent</span>
            <strong>{rupees(listing.monthly_rent)}<small> / month</small></strong>
          </div>
          <div className="detail-deposit">
            <span>Security deposit</span>
            <strong>{rupees(listing.security_deposit)}</strong>
          </div>
        </div>

        <section className="detail-about">
          <h3>About this place</h3>
          <p className="detail-description">{listing.description}</p>
        </section>

        <section className="detail-overview">
          <h3>At a glance</h3>
          <div className="detail-facts">
            <div><span>Available beds</span><strong>{listing.available_beds}</strong></div>
            <div><span>Brokerage</span><strong>{rupees(listing.brokerage)}</strong></div>
            <div><span>Furnishing</span><strong>{listing.is_furnished ? "Furnished" : "Unfurnished"}</strong></div>
            <div><span>Listed by</span><strong>{listing.owner_name}</strong></div>
            <div><span>Viewers in last 24 hours</span><strong>{listing.views_last_day ?? 0}</strong></div>
            <div><span>People who contacted the lister</span><strong>{contactCount}</strong></div>
            <div><span>People who contacted the lister</span><strong>{contactCount}</strong></div>
          </div>
        </section>

        {listing.user_id !== currentUserId && listing.status === "ACTIVE" && (
          <section className="listing-inquiry-section">
            {inquiryStatus && <p className="message" role="status">{inquiryStatus}</p>}
            <div className="direct-contact-panel">
              <div>
                <strong>Want to speak directly?</strong>
                <span>Call or WhatsApp the lister.</span>
              </div>
              {!ownerContact ? (
                <button type="button" className="reveal-contact-button" onClick={revealContact} disabled={loadingContact}>
                  {loadingContact ? "Getting contact…" : "Show contact"}
                </button>
              ) : (
                <div className="direct-contact-actions">
                  <a className="direct-contact-link" href={`tel:${ownerContact.phone}`} onClick={() => { void trackContact("CALL"); }}>Call lister</a>
                  <a
                    className="direct-contact-link whatsapp"
                    href={`https://wa.me/${ownerPhoneDigits}?text=${directWhatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { void trackContact("WHATSAPP"); }}
                  >
                    WhatsApp lister
                  </a>
                </div>
              )}
              {contactError && <p className="contact-error" role="alert">{contactError}</p>}
            </div>
            {!showInquiry ? (
              <button type="button" className="detail-contact-button" onClick={() => setShowInquiry(true)}>
                Message the lister
              </button>
            ) : (
              <form className="inquiry-form" onSubmit={submitInquiry}>
                <h3>Send an enquiry</h3>
                <label>
                  Your message
                  <textarea
                    value={inquiryMessage}
                    onChange={(event) => setInquiryMessage(event.target.value)}
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder="Hi, I’m interested in this room. Is it still available?"
                    required
                  />
                </label>
                <label className={`phone-consent-option${sharePhone ? " is-checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={sharePhone}
                    onChange={(event) => setSharePhone(event.target.checked)}
                    required
                  />
                  <span>
                    <strong>Share my verified number</strong>
                    <small>The lister can call or WhatsApp you about this enquiry.</small>
                  </span>
                </label>
                <div className="inquiry-actions">
                  <button type="submit" disabled={busy || !sharePhone}>
                    {busy ? "Sending…" : "Send enquiry"}
                  </button>
                  <button type="button" className="cancel-edit" onClick={() => setShowInquiry(false)}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        )}

        {listing.user_id !== currentUserId && listing.status === "FILLED" && (
          <div className="filled-listing-notice" role="status">
            This place has been filled. The lister is not accepting new contacts for this listing.
          </div>
        )}

        {listing.user_id !== currentUserId && listing.status === "ACTIVE" && (
          <section className="report-listing-section">
            {reportStatus && <p className="message" role="status">{reportStatus}</p>}
            {!showReport ? (
              <button type="button" className="report-listing-toggle" onClick={() => setShowReport(true)}>
                Report this listing
              </button>
            ) : (
              <form className="report-listing-form" onSubmit={submitReport}>
                <h3>Tell us what seems wrong</h3>
                <label>
                  Reason
                  <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                    <option value="SCAM">Possible scam or fraud</option>
                    <option value="WRONG_INFO">Incorrect listing information</option>
                    <option value="DUPLICATE">Duplicate listing</option>
                    <option value="INAPPROPRIATE">Inappropriate content</option>
                    <option value="OTHER">Something else</option>
                  </select>
                </label>
                <label>
                  Details (optional)
                  <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Share details that can help us review this listing." />
                </label>
                <div className="inquiry-actions">
                  <button type="submit" disabled={reportBusy}>{reportBusy ? "Sending…" : "Submit report"}</button>
                  <button type="button" className="cancel-edit" onClick={() => setShowReport(false)}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        )}

        <button className="detail-done" onClick={onClose}>Back to listings</button>
      </article>
    </div>
  );
}
