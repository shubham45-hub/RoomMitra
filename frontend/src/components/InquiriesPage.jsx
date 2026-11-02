import { useEffect, useState } from "react";
import { getInquiryInbox } from "../services/listings";

export default function InquiriesPage({ token, onBack }) {
  const [inquiries, setInquiries] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInquiryInbox(token)
      .then(setInquiries)
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="inquiries-page">
      <button className="back-button" onClick={onBack}>← Back to listings</button>
      <p className="eyebrow">ROOMMITRA MESSAGES</p>
      <h1>Inquiries</h1>
      <p className="my-listings-intro">People interested in your rooms will appear here.</p>

      {message && <p className="message" role="alert">{message}</p>}
      {loading ? (
        <div className="empty-state">Loading your inquiries…</div>
      ) : inquiries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✉</span>
          <h3>No inquiries yet</h3>
          <p>When someone messages you about a listing, you’ll see it here.</p>
        </div>
      ) : (
        <div className="inquiries-list">
          {inquiries.map((inquiry) => {
            const phoneDigits = (inquiry.sender_phone || "").replace(/\D/g, "");
            const whatsappMessage = encodeURIComponent(`Hi ${inquiry.sender_name}, I saw your inquiry about ${inquiry.listing_title} on RoomMitra.`);
            return (
              <article className="inquiry-card" key={inquiry.id}>
                <div className="inquiry-card-heading">
                  <div>
                    <p className="eyebrow">ABOUT: {inquiry.listing_title}</p>
                    <h2>{inquiry.sender_name}</h2>
                  </div>
                  {inquiry.is_new && <span className="inquiry-new-badge">NEW</span>}
                  <time dateTime={inquiry.created_at}>
                    {new Date(inquiry.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className="inquiry-message">{inquiry.message}</p>
                <p className="inquiry-phone">Verified phone shared: <strong>{inquiry.sender_phone}</strong></p>
                <div className="inquiry-actions">
                  <a className="inquiry-contact-button" href={`tel:${inquiry.sender_phone}`}>Call</a>
                  <a
                    className="inquiry-contact-button whatsapp"
                    href={`https://wa.me/${phoneDigits}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Reply on WhatsApp
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
