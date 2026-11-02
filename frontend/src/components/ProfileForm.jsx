import { useState } from "react";
import { updateProfile } from "../services/profile";

export default function ProfileForm({ profile, token, onSaved, onSignOut, onBack, }) {
  const [name, setName] = useState(
    profile.name === "RoomMitra user" ? "" : profile.name
  );
  const [email, setEmail] = useState(profile.email || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const updated = await updateProfile(token, {
        name,
        email: email.trim() || null,
      });
      onSaved(updated);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <p className="eyebrow">ROOMMITRA</p>
      <h1>Your profile</h1>
      <p className="phone-chip">{profile.phone}</p>

      <form onSubmit={save}>
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your name"
          required
        />

        <label htmlFor="email">Email (optional)</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <button disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <button className="text-button" onClick={onBack}>
        Back to listings
      </button>

      <button className="text-button" onClick={onSignOut}>
        Sign out
      </button>

      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}