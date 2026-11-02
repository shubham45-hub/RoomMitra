import { useState } from "react";
import PhotoGallery from "./PhotoGallery";
import { getListingContact, sendListingInquiry } from "../services/listings";

export default function ListingDetails({ listing, token, currentUserId, onClose }) {
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [contactError, setContactError] = useState("");
  const [loadingContact, setLoadingContact] = useState(false);
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

        <span className="listing-type">{listing.flat_type}</span>
        <h2 id="detail-title">{listing.title}</h2>
        <p className="listing-location">
          {listing.locality}, {listing.city}
          {listing.pincode ? ` · ${listing.pincode}` : ""}
        </p>

        <PhotoGallery
          photoUrls={listing.photo_urls || []}
          title={listing.title}
          variant="details"
        />

        <p className="detail-description">{listing.description}</p>

        <div className="detail-facts">
          <div><span>Monthly rent</span><strong>{rupees(listing.monthly_rent)}</strong></div>
          <div><span>Security deposit</span><strong>{rupees(listing.security_deposit)}</strong></div>
          <div><span>Available beds</span><strong>{listing.available_beds}</strong></div>
          <div><span>Brokerage</span><strong>{rupees(listing.brokerage)}</strong></div>
          <div><span>Furnished</span><strong>{listing.is_furnished ? "Yes" : "No"}</strong></div>
          <div><span>Posted by</span><strong>{listing.owner_name}</strong></div>
        </div>

        {listing.user_id !== currentUserId && (
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
                  <a className="direct-contact-link" href={`tel:${ownerContact.phone}`}>Call lister</a>
                  <a
                    className="direct-contact-link whatsapp"
                    href={`https://wa.me/${ownerPhoneDigits}?text=${directWhatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
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

        <button className="detail-done" onClick={onClose}>Back to listings</button>
      </article>
    </div>
  );
}
