import { useState } from "react";
import { getImageUrl } from "../services/api";
import { updateProfile, uploadProfileAvatar } from "../services/profile";

export default function ProfileForm({ profile, token, onSaved, onSignOut, onBack, onboarding = false }) {
  const [name, setName] = useState(
    profile.name === "RoomMitra user" ? "" : profile.name
  );
  const [email, setEmail] = useState(profile.email || "");
  const [preferredCity, setPreferredCity] = useState(profile.preferred_city || "");
  const [sex, setSex] = useState(profile.sex || "");
  const [religion, setReligion] = useState(profile.religion || "");
  const [originState, setOriginState] = useState(profile.origin_state || "");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url ? getImageUrl(profile.avatar_url) : "");
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
        preferred_city: preferredCity,
        sex,
        religion,
        origin_state: originState,
      });
      let nextProfile = updated;
      if (avatar) {
        const uploaded = await uploadProfileAvatar(token, avatar);
        nextProfile = { ...updated, avatar_url: uploaded.avatar_url };
      }
      onSaved(nextProfile);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card profile-card${onboarding ? " is-onboarding" : ""}`}>
      <header className="profile-header">
        <p className="eyebrow">{onboarding ? "WELCOME TO ROOMMITRA" : "YOUR ROOMMITRA PROFILE"}</p>
        <h1>{onboarding ? "Let’s get to know you" : "Your profile"}</h1>
        <p className="profile-intro">
          {onboarding
            ? "A few details will help you find a room and flatmate that feel right."
            : "Keep your details up to date so your room search feels more personal."}
        </p>
        <div className="phone-chip">
          <div className="phone-chip-copy">
            <span>Verified mobile</span>
            <strong>{profile.phone}</strong>
          </div>
        </div>
      </header>

      <div className="profile-photo-field">
        {avatarPreview
          ? <img className="profile-photo-preview" src={avatarPreview} alt="Profile preview" />
          : <span className="profile-photo-placeholder">{name.trim().charAt(0).toUpperCase() || "＋"}</span>}
        <div className="profile-photo-copy">
          <label htmlFor="profile-photo">Add a profile photo <span>(optional)</span></label>
          <p>A friendly photo helps make your profile feel more personal.</p>
          <input
            id="profile-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              setAvatar(selected);
              if (selected) setAvatarPreview(URL.createObjectURL(selected));
            }}
          />
          <small>JPEG, PNG, or WebP · up to 5 MB</small>
        </div>
      </div>

      <form className="profile-form" onSubmit={save}>
        <div className="profile-form-grid">
          <div className="profile-field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="preferred-city">City you want to search</label>
            <input
              id="preferred-city"
              value={preferredCity}
              onChange={(event) => setPreferredCity(event.target.value)}
              placeholder="Kolkata"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="sex">Sex</label>
            <select id="sex" value={sex} onChange={(event) => setSex(event.target.value)} required>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="origin-state">State you are from</label>
            <input
              id="origin-state"
              value={originState}
              onChange={(event) => setOriginState(event.target.value)}
              placeholder="e.g. West Bengal"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="religion">Religion</label>
            <input
              id="religion"
              value={religion}
              onChange={(event) => setReligion(event.target.value)}
              placeholder="Enter your religion"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="email">Email {onboarding ? "" : "(optional)"}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required={onboarding}
            />
          </div>
        </div>

        <button className="profile-save-button" disabled={busy}>
          {busy ? "Saving…" : onboarding ? "Save and continue" : "Save profile"}
        </button>
      </form>

      <div className="profile-footer">
        {!onboarding && <button className="text-button" onClick={onBack}>Back to listings</button>}

        <button className="text-button" onClick={onSignOut}>Sign out</button>
      </div>

      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}
