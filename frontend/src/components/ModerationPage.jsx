import { useEffect, useState } from "react";
import { getModerationReports, updateModerationReport } from "../services/listings";

const REASONS = {
  SCAM: "Possible scam or fraud",
  WRONG_INFO: "Incorrect listing information",
  DUPLICATE: "Duplicate listing",
  INAPPROPRIATE: "Inappropriate content",
  COPYRIGHT: "Copyright infringement",
  OTHER: "Something else",
};

export default function ModerationPage({ token, onBack }) {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getModerationReports(token, statusFilter)
      .then((items) => {
        if (!cancelled) {
          setReports(items);
          setMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });
    return () => { cancelled = true; };
  }, [token, statusFilter]);

  async function review(report, status, pauseListing = false) {
    setBusyId(report.id);
    setMessage("");
    try {
      await updateModerationReport(token, report.id, { status, pause_listing: pauseListing });
      setReports(await getModerationReports(token, statusFilter));
      setMessage(pauseListing ? "Listing paused and report updated." : "Report updated.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="moderation-page">
      <button className="back-button" onClick={onBack}>← Back to listings</button>
      <p className="eyebrow">ROOMMITRA TRUST & SAFETY</p>
      <h1>Listing reports</h1>
      <p className="moderation-intro">Application owner review queue. Check reports and take action on suspicious listings.</p>

      <label className="moderation-filter">
        Show reports
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="OPEN">Open</option>
          <option value="REVIEWING">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </label>
      {message && <p className="message" role="status">{message}</p>}
      {!reports.length ? <p className="empty-state">No reports in this queue.</p> : (
        <div className="moderation-report-list">
          {reports.map((report) => (
            <article className="moderation-report-card" key={report.id}>
              <div className="moderation-report-heading">
                <div>
                  <p className="eyebrow">REPORT #{report.id} · {report.status}</p>
                  <h2>{report.listing_title}</h2>
                  <p>{report.locality}, {report.city} · Listing is {report.listing_status.toLowerCase()}</p>
                </div>
                <time>{new Date(report.created_at).toLocaleString()}</time>
              </div>
              <p><strong>Reported by:</strong> {report.reporter_name}</p>
              <p><strong>Reason:</strong> {REASONS[report.reason] || report.reason}</p>
              {report.details && <p className="moderation-report-details">{report.details}</p>}
              <div className="moderation-actions">
                <button disabled={busyId === report.id} onClick={() => review(report, "REVIEWING")}>Mark in review</button>
                <button className="secondary" disabled={busyId === report.id} onClick={() => review(report, "RESOLVED")}>Resolve</button>
                <button className="moderation-pause" disabled={busyId === report.id || report.listing_status !== "ACTIVE"} onClick={() => review(report, "RESOLVED", true)}>Pause listing & resolve</button>
                <button className="cancel-edit" disabled={busyId === report.id} onClick={() => review(report, "DISMISSED")}>Dismiss</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
