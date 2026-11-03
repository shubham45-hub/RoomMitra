import { useEffect, useRef, useState } from "react";
import { createListing, uploadListingImages } from "../services/listings";
import LocalityAutocomplete from "./LocalityAutocomplete";

const photoCategories = [
  ["HALL", "Hall"],
  ["KITCHEN", "Kitchen"],
  ["WASHROOM", "Washroom"],
  ["BEDROOM", "Bedroom"],
  ["OTHER", "Other areas"],
];

const initialForm = {
  title: "",
  description: "",
  city: "",
  locality: "",
  pincode: "",
  flat_type: "",
  available_beds: "1",
  occupants_count: "0",
  monthly_rent: "",
  rent_basis: "PER_PERSON",
  security_deposit: "",
  deposit_same_as_rent: false,
  furnishing_status: "UNFURNISHED",
  available_for: "ANY",
  brokerage: "0",
};

function emptyForm(preferredCity, profileSex) {
  const defaultAudience = profileSex === "male" ? "MALE" : profileSex === "female" ? "FEMALE" : "ANY";
  return { ...initialForm, city: preferredCity || "", available_for: defaultAudience };
}

export default function CreateListingForm({ token, preferredCity, profileSex, onCreated, onCancel }) {
  const [form, setForm] = useState(() => emptyForm(preferredCity, profileSex));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const previewUrlsRef = useRef([]);

  useEffect(() => {
    return () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function clearPhotos() {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setPreviewUrls([]);
    setPhotos([]);
  }

  function choosePhotos(category, selected) {
    const otherPhotos = photos.filter((photo) => photo.category !== category);
    if (otherPhotos.length + selected.length > 12) {
      setPhotoError(`A listing can have up to 12 photos. You can add ${12 - otherPhotos.length} more.`);
      return;
    }
    photos.filter((photo) => photo.category === category).forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl);
      previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
    });
    const added = selected.map((file) => ({ file, category, previewUrl: URL.createObjectURL(file) }));
    previewUrlsRef.current.push(...added.map((photo) => photo.previewUrl));
    const next = [...otherPhotos, ...added];
    setPhotos(next);
    setPreviewUrls(next.map((photo) => photo.previewUrl));
    setPhotoError("");
  }

  function removeSelectedPhoto(photo) {
    URL.revokeObjectURL(photo.previewUrl);
    previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
    const next = photos.filter((item) => item.previewUrl !== photo.previewUrl);
    setPhotos(next);
    setPreviewUrls(next.map((item) => item.previewUrl));
    setPhotoError("");
  }

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  const keyPhotoAreas = photoCategories.slice(0, 4).map(([category, label]) => ({
    category,
    label,
    covered: photos.some((photo) => photo.category === category),
  }));
  const coveredPhotoAreas = keyPhotoAreas.filter((area) => area.covered).length;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const { deposit_same_as_rent, ...listingFields } = form;
      const created = await createListing(token, {
        ...listingFields,
        pincode: form.pincode.trim() || null,
        available_beds: Number(form.available_beds),
        occupants_count: Number(form.occupants_count),
        monthly_rent: Number(form.monthly_rent),
        security_deposit: deposit_same_as_rent
          ? Number(form.monthly_rent)
          : form.security_deposit ? Number(form.security_deposit) : null,
        is_furnished: form.furnishing_status === "FURNISHED",
        brokerage: Number(form.brokerage || 0),
      });

      if (photos.length) {
        try {
          await uploadListingImages(token, created.id, photos);
        } catch (uploadError) {
          setForm(emptyForm(preferredCity, profileSex));
          clearPhotos();
          onCreated(
            created,
            `Your listing was published, but its photos could not be uploaded: ${uploadError.message}`,
          );
          return;
        }
      }

      setForm(emptyForm(preferredCity, profileSex));
      clearPhotos();
      onCreated(created);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="create-listing-panel">
      <div className="create-listing-heading">
        <div>
          <p className="eyebrow">YOUR NEXT ROOMMATE</p>
          <h2>Post a listing</h2>
          <p className="create-listing-subtitle">A few clear details help the right flatmate find your place.</p>
        </div>
        <button type="button" className="close-form" onClick={onCancel} aria-label="Close listing form">
          <span aria-hidden="true">×</span> Close
        </button>
      </div>

      <form className="listing-form" onSubmit={submit}>
        <section className="listing-form-section">
          <div className="listing-section-heading">
            <span className="listing-section-number">01</span>
            <div><h3>About the space</h3><p>Give your room a clear title and description.</p></div>
          </div>
        <label>
          Listing title
          <input
            name="title"
            value={form.title}
            onChange={update}
            placeholder="Room available in Salt Lake"
            minLength={5}
            maxLength={200}
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={update}
            placeholder="Describe the room, flat, and what you are looking for in a flatmate."
            minLength={20}
            maxLength={10000}
            rows={4}
            required
          />
        </label>

        <div className="listing-photo-field">
          <p className="photo-field-title">Add photos of the flat <span>Optional · up to 12 photos total</span></p>
          <p className="photo-help">Add clear photos of each area so flatmates can see the space.</p>
          <div className="photo-coverage" aria-label={`${coveredPhotoAreas} of 4 key photo areas covered`}>
            <strong>Key area coverage <span>{coveredPhotoAreas}/4</span></strong>
            <div>
              {keyPhotoAreas.map((area) => (
                <span className={area.covered ? "is-covered" : ""} key={area.category}>
                  <span aria-hidden="true">{area.covered ? "✓" : "＋"}</span>{area.label}
                </span>
              ))}
            </div>
          </div>
          <div className="listing-photo-categories">
            {photoCategories.map(([category, label]) => (
              <label key={category}>
                {label}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    choosePhotos(category, Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />
                <small>{photos.filter((photo) => photo.category === category).length} selected</small>
              </label>
            ))}
          </div>
          <p className="photo-help">JPEG, PNG, or WebP. Each photo must be 5 MB or smaller. Total: {photos.length}/12.</p>
          {photoError && <p className="message" role="alert">{photoError}</p>}
          {previewUrls.length > 0 && (
            <div className="photo-preview-grid">
              {photos.map((photo, index) => (
                <div className="photo-preview-item" key={photo.previewUrl}>
                  <img src={photo.previewUrl} alt={`${photoCategories.find(([category]) => category === photo.category)?.[1]} photo ${index + 1}`} />
                  <small>{photoCategories.find(([category]) => category === photo.category)?.[1]}</small>
                  <button type="button" className="photo-preview-remove" onClick={() => removeSelectedPhoto(photo)} aria-label={`Remove ${photoCategories.find(([category]) => category === photo.category)?.[1]} photo ${index + 1}`}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        </section>

        <section className="listing-form-section">
          <div className="listing-section-heading">
            <span className="listing-section-number">02</span>
            <div><h3>Where is it?</h3><p>Set the location so people can find nearby homes.</p></div>
          </div>
        <div className="listing-form-row">
          <label>
            City
            <input
              name="city"
              value={form.city}
              onChange={update}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <LocalityAutocomplete
            city={form.city}
            value={form.locality}
            onChange={(locality) =>
              setForm((current) => ({ ...current, locality }))
            }
          />
        </div>

        <div className="listing-form-row">
          <label>
            Flat type
            <input
              name="flat_type"
              value={form.flat_type}
              onChange={update}
              placeholder="2BHK"
              minLength={2}
              maxLength={20}
              required
            />
          </label>
          <label>
            Pincode (optional)
            <input
              name="pincode"
              value={form.pincode}
              onChange={update}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="700091"
            />
          </label>
        </div>
        </section>

        <section className="listing-form-section">
          <div className="listing-section-heading">
            <span className="listing-section-number">03</span>
            <div><h3>Rent and availability</h3><p>Be upfront about the monthly cost and what is included.</p></div>
          </div>
        <div className="listing-form-row listing-form-numbers">
          <label>
            People currently required
            <input
              name="available_beds"
              type="number"
              min="1"
              max="20"
              value={form.available_beds}
              onChange={update}
              required
            />
          </label>
          <label>
            People currently living in the flat
            <input
              name="occupants_count"
              type="number"
              min="0"
              max="20"
              value={form.occupants_count}
              onChange={update}
              required
            />
          </label>
          <label>
            Monthly rent (₹)
            <input
              name="monthly_rent"
              type="number"
              min="1"
              value={form.monthly_rent}
              onChange={update}
              placeholder="12000"
              required
            />
          </label>
        </div>

        <div className="listing-form-row listing-form-numbers">
          <div className="deposit-field">
            <label htmlFor="security-deposit">Security deposit (₹)</label>
            <input
              id="security-deposit"
              name="security_deposit"
              type="number"
              min="0"
              value={form.deposit_same_as_rent ? form.monthly_rent : form.security_deposit}
              disabled={form.deposit_same_as_rent}
              onChange={update}
              placeholder="Optional"
            />
            <label className="deposit-match-option">
              <input name="deposit_same_as_rent" type="checkbox" checked={form.deposit_same_as_rent} onChange={update} />
              Same as monthly rent
            </label>
          </div>
          <label>
            Brokerage (₹)
            <input
              name="brokerage"
              type="number"
              min="0"
              value={form.brokerage}
              onChange={update}
            />
          </label>
          <label>
            Rent applies to
            <select name="rent_basis" value={form.rent_basis} onChange={update}>
              <option value="PER_PERSON">Each person</option>
              <option value="WHOLE_FLAT">Whole flat</option>
            </select>
          </label>
        </div>
        </section>

        <fieldset className="furnishing-options">
          <legend>Furnishing</legend>
          {[
            ["FURNISHED", "Furnished"],
            ["SEMI_FURNISHED", "Semi-furnished"],
            ["UNFURNISHED", "Unfurnished"],
          ].map(([value, label]) => (
            <label className="furnishing-choice" key={value}>
              <input type="radio" name="furnishing_status" value={value} checked={form.furnishing_status === value} onChange={update} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="listing-audience-options">
          <legend>Who can rent this room?</legend>
          <p>Choose who should see and contact you about this listing.</p>
          {[
            ["MALE", "Men"],
            ["FEMALE", "Women"],
            ["ANY", "Anyone"],
          ].map(([value, label]) => (
            <label className="listing-audience-choice" key={value}>
              <input type="radio" name="available_for" value={value} checked={form.available_for === value} onChange={update} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        {message && <p className="message" role="alert">{message}</p>}

        <div className="listing-submit-bar">
          <p>Your listing will be visible to flatmates in {form.city || "your selected city"}.</p>
          <button className="publish-button" disabled={busy}>
            {busy ? "Publishing…" : "Publish listing"}<span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
