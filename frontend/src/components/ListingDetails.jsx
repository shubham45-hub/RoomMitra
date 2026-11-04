import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PhotoGallery from "./PhotoGallery";
import ListingReaction from "./ListingReaction";
import { getListingContact, recordListingContact, reportListing, sendListingInquiry } from "../services/listings";

function ListingDetails({ listing, token, currentUserId, onClose, onContactCountChanged, onReactionChange, focusContact = false, initialOwnerContact = null, initialContactError = "" }) {
  const [showInquiry, setShowInquiry] = useState(focusContact && listing.status === "ACTIVE" && listing.user_id !== currentUserId);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerContact, setOwnerContact] = useState(initialOwnerContact);
  const [contactError, setContactError] = useState(initialContactError);
  const [loadingContact, setLoadingContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("SCAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [contactCount, setContactCount] = useState(listing.contacts_total ?? 0);
  const detailPanelRef = useRef(null);
  const contactSectionRef = useRef(null);
  const photoCategories = useMemo(
    () => (listing.photos || []).map((photo) => photo.category),
    [listing.photos],
  );
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

  const revealContact = useCallback(async () => {
    setLoadingContact(true);
    setContactError("");
    try {
      setOwnerContact(await getListingContact(token, listing.id));
    } catch (error) {
      setContactError(error.message);
    } finally {
      setLoadingContact(false);
    }
  }, [listing.id, token]);

  useEffect(() => {
    if (!focusContact || listing.status !== "ACTIVE" || listing.user_id === currentUserId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const panel = detailPanelRef.current;
      const contactSection = contactSectionRef.current;
      if (panel && contactSection) {
        const top = panel.scrollTop + contactSection.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
        panel.scrollTo({ top, behavior: "smooth" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentUserId, focusContact, listing.status, listing.user_id]);

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
  const peopleSharing = (listing.occupants_count ?? 0) + (listing.people_needed ?? listing.available_beds);

  return (
    <div className="detail-overlay" onMouseDown={onClose}>
      <article
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-sticky-bar">
          <button type="button" className="detail-back-button" onClick={onClose}>
            <span aria-hidden="true">←</span> Back to listings
          </button>
          <button type="button" className="detail-close" onClick={onClose} aria-label="Close listing details">
            ×
          </button>
        </div>

        <div className="detail-scroll-content" ref={detailPanelRef}>

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
          <a
            className="detail-map-link"
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${listing.locality}, ${listing.city}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="detail-map-icon" aria-hidden="true">⌖</span>
            View area map <span className="detail-map-arrow" aria-hidden="true">↗</span>
          </a>
        </div>

        <PhotoGallery
          photoUrls={listing.photo_urls || []}
          photoCategories={photoCategories}
          title={listing.title}
          variant="details"
        />

        <ListingReaction listing={listing} token={token} currentUserId={currentUserId} onChanged={onReactionChange} />

        <div className="detail-price-card">
          <div className="detail-rent">
            <span>{listing.rent_basis === "WHOLE_FLAT" ? "Total monthly rent" : "Monthly rent per person"}</span>
            <strong>{rupees(listing.monthly_rent)}<small> / month</small></strong>
            {listing.rent_basis === "WHOLE_FLAT" && peopleSharing > 0 && (
              <small className="detail-rent-split">
                Approx. {rupees(Math.round(listing.monthly_rent / peopleSharing))} per person if split evenly among {peopleSharing} residents
              </small>
            )}
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
            <div><span>People currently living</span><strong>{listing.occupants_count ?? 0}</strong></div>
            <div><span>People currently required</span><strong>{listing.people_needed ?? listing.available_beds}</strong></div>
            <div><span>Brokerage</span><strong>{rupees(listing.brokerage)}</strong></div>
            <div><span>Furnishing</span><strong>{({ FURNISHED: "Furnished", SEMI_FURNISHED: "Semi-furnished", UNFURNISHED: "Unfurnished" })[listing.furnishing_status] || (listing.is_furnished ? "Furnished" : "Unfurnished")}</strong></div>
            <div><span>Who can rent</span><strong>{{ MALE: "Men", FEMALE: "Women", ANY: "Anyone" }[listing.available_for] || "Anyone"}</strong></div>
            <div><span>Listed by</span><strong>{listing.owner_name}</strong></div>
            <div><span>Viewers in last 24 hours</span><strong>{listing.views_last_day ?? 0}</strong></div>
            <div><span>People who contacted the lister</span><strong>{contactCount}</strong></div>
          </div>
        </section>

        {listing.user_id !== currentUserId && listing.status === "ACTIVE" && (
          <section className="listing-inquiry-section" ref={contactSectionRef}>
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
                    <strong>Share my phone number</strong>
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
                  <option value="COPYRIGHT">Copyright infringement</option>
                  <option value="OTHER">Something else</option>
                  </select>
                </label>
                <label>
                  Details (optional)
                  <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} required={reportReason === "COPYRIGHT"} placeholder={reportReason === "COPYRIGHT" ? "Identify the protected work and where it appears in this listing." : "Share details that can help us review this listing."} />
                </label>
                {reportReason === "COPYRIGHT" && (
                  <p className="copyright-report-help">
                    Identify the work you own or represent, where it appears in this listing, and how the operator can verify your claim. Do not include sensitive identity documents.
                  </p>
                )}
                <div className="inquiry-actions">
                  <button type="submit" disabled={reportBusy}>{reportBusy ? "Sending…" : "Submit report"}</button>
                  <button type="button" className="cancel-edit" onClick={() => setShowReport(false)}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        )}

        <button className="detail-done" onClick={onClose}>Back to listings</button>
        </div>
      </article>
    </div>
  );
}

export default memo(ListingDetails);
