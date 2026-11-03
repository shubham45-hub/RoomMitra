import { useMemo, useState } from "react";

const HOMES = [
  {
    id: 1,
    title: "Sunny room near Karunamoyee Metro",
    locality: "Karunamoyee",
    city: "Kolkata",
    rent: 7000,
    flatType: "2BHK",
    beds: 1,
    residents: 2,
    needed: 1,
    owner: "Aarav Mehta",
    description: "A bright, furnished room in a friendly shared flat, a short walk from the metro. The flat has a spacious hall, a shared kitchen, and a quiet balcony.",
    scene: "sage",
  },
  {
    id: 2,
    title: "Comfortable space in New Town",
    locality: "New Town",
    city: "Kolkata",
    rent: 6000,
    flatType: "3BHK",
    beds: 1,
    residents: 2,
    needed: 1,
    owner: "Mira Das",
    description: "A calm, semi-furnished home close to shops and daily transport. Looking for a considerate flatmate to share a clean and relaxed space.",
    scene: "clay",
  },
  {
    id: 3,
    title: "Furnished room by Salt Lake Sector V",
    locality: "Salt Lake",
    city: "Kolkata",
    rent: 8500,
    flatType: "2BHK",
    beds: 1,
    residents: 1,
    needed: 1,
    owner: "Rohan Sen",
    description: "A well-kept furnished flat with a dedicated workspace and an easy commute to Sector V. The room gets lovely afternoon light.",
    scene: "blue",
  },
];

function RoomIllustration({ scene }) {
  const palette = {
    sage: { wall: "#f0eee5", floor: "#c5a486", accent: "#b5c9b2", sofa: "#d8d1c2", curtain: "#c5d5bf" },
    clay: { wall: "#f2e9dd", floor: "#bd9679", accent: "#d8b18e", sofa: "#e4d8c8", curtain: "#c9b09b" },
    blue: { wall: "#e8edf0", floor: "#b7a08c", accent: "#afc6d2", sofa: "#d2d8d5", curtain: "#bdcbd1" },
  }[scene];

  return (
    <svg className="demo-room-art" viewBox="0 0 720 390" role="img" aria-label="Illustration of a bright shared flat living room">
      <rect width="720" height="305" fill={palette.wall} />
      <rect y="305" width="720" height="85" fill={palette.floor} />
      <rect x="60" y="42" width="175" height="182" rx="4" fill="#f9fbf6" />
      <rect x="72" y="54" width="151" height="158" fill="#b9d4d8" />
      <path d="M147 54v158M72 133h151" stroke="#faf8ef" strokeWidth="9" />
      <path d="M51 38h18v192H51zm183 0h18v192h-18z" fill={palette.curtain} />
      <rect x="427" y="40" width="135" height="92" rx="3" fill="#fffaf0" />
      <rect x="438" y="51" width="113" height="70" fill={palette.accent} />
      <circle cx="494" cy="86" r="22" fill="#ecdfca" opacity=".85" />
      <ellipse cx="360" cy="333" rx="234" ry="33" fill="#8a725f" opacity=".19" />
      <rect x="238" y="207" width="300" height="113" rx="26" fill={palette.sofa} />
      <rect x="254" y="188" width="115" height="72" rx="21" fill="#e9e0d1" />
      <rect x="382" y="188" width="137" height="72" rx="21" fill="#e2d6c4" />
      <rect x="221" y="252" width="28" height="76" rx="10" fill="#aa8b72" />
      <rect x="530" y="252" width="28" height="76" rx="10" fill="#aa8b72" />
      <rect x="330" y="252" width="57" height="20" rx="9" fill={palette.accent} />
      <ellipse cx="385" cy="328" rx="87" ry="20" fill="#896c56" />
      <rect x="378" y="326" width="14" height="37" fill="#765d4c" />
      <rect x="110" y="250" width="58" height="62" rx="9" fill="#ab8867" />
      <path d="M138 245c-28-36-12-64 2-77 18 26 23 48-2 77m6 0c1-37 24-54 42-58 0 27-12 49-42 58m-10 1c-13-30-38-39-55-34 8 24 25 38 55 34" fill="#718d68" />
      <path d="M28 304h665" stroke="#ffffff" strokeOpacity=".5" strokeWidth="3" />
    </svg>
  );
}

export default function DemoPreview() {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(null);
  const homes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return HOMES;
    return HOMES.filter((home) =>
      `${home.title} ${home.locality} ${home.city} ${home.flatType}`.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <main className="demo-page">
      <div className="demo-shell">
        <header className="demo-header">
          <a className="wordmark" href="#top" aria-label="RoomMitra home">
            <span className="wordmark-icon">R</span> RoomMitra
          </a>
          <span className="demo-preview-badge"><span /> Interactive preview</span>
        </header>

        <section className="demo-hero" id="top">
          <p className="eyebrow">ROOMMATES, MADE EASIER</p>
          <h1>Find a place<br />that feels like yours.</h1>
          <p>Thoughtful room listings for finding your next shared home in Kolkata.</p>
          <form className="demo-search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="demo-query">Search homes</label>
            <input id="demo-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try New Town or 2BHK" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </form>
          <span className="demo-city-note">Showing sample homes in <strong>Kolkata</strong></span>
        </section>

        <section className="demo-results" aria-live="polite">
          <div className="demo-results-heading">
            <div><p className="eyebrow">ROOMS & FLATS</p><h2>{query ? "Homes matching your search" : "A few places to explore"}</h2></div>
            <span>{homes.length} sample {homes.length === 1 ? "home" : "homes"}</span>
          </div>
          {homes.length ? (
            <div className="demo-home-grid">
              {homes.map((home) => (
                <article className="demo-home-card" key={home.id}>
                  <div className={`demo-home-image is-${home.scene}`}>
                    <RoomIllustration scene={home.scene} />
                    <span className="demo-available-pill">Available</span>
                    <span className="demo-flat-pill">{home.flatType}</span>
                  </div>
                  <div className="demo-home-body">
                    <p className="demo-home-location">⌖ {home.locality}, {home.city}</p>
                    <h3>{home.title}</h3>
                    <div className="demo-home-meta"><span>{home.residents} living</span><span>{home.needed} needed</span></div>
                    <div className="demo-home-footer">
                      <p><strong>₹{home.rent.toLocaleString("en-IN")}</strong><span> / month</span></p>
                      <span className="demo-owner"><span>{home.owner.charAt(0)}</span> {home.owner}</span>
                    </div>
                    <div className="demo-home-actions">
                      <button type="button" className="demo-details-button" onClick={() => setSelected(home)}>View details <span aria-hidden="true">→</span></button>
                      <button
                        type="button"
                        className={`demo-save-button${saved.includes(home.id) ? " is-saved" : ""}`}
                        onClick={() => setSaved((current) => current.includes(home.id) ? current.filter((id) => id !== home.id) : [...current, home.id])}
                        aria-pressed={saved.includes(home.id)}
                      >{saved.includes(home.id) ? "♥ Saved" : "♡ Save"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="demo-empty"><span>⌕</span><h3>No sample homes match</h3><p>Try a locality like New Town or Salt Lake.</p></div>
          )}
        </section>

        <footer className="demo-footer">
          <span><strong>RoomMitra</strong> · Created by Shubham Kumar</span>
          <span>Demo preview · Listings shown are examples</span>
        </footer>
      </div>

      {selected && (
        <div className="demo-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
            <button className="demo-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close listing details">×</button>
            <div className={`demo-modal-art is-${selected.scene}`}><RoomIllustration scene={selected.scene} /></div>
            <p className="demo-home-location">⌖ {selected.locality}, {selected.city}</p>
            <h2 id="demo-modal-title">{selected.title}</h2>
            <p className="demo-modal-description">{selected.description}</p>
            <div className="demo-modal-facts"><span>{selected.flatType}</span><span>{selected.residents} currently living</span><span>{selected.needed} person needed</span></div>
            <div className="demo-modal-price"><strong>₹{selected.rent.toLocaleString("en-IN")}</strong><span> / month</span></div>
            <p className="demo-modal-note">This is a preview with sample content. Sign-in and contacting listers are not connected in this demo.</p>
          </section>
        </div>
      )}
    </main>
  );
}
