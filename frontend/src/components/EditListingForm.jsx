import { useEffect, useRef, useState } from "react";
import {
  deleteListingImage,
  updateListing,
  uploadListingImages,
} from "../services/listings";
import { getImageUrl } from "../services/api";

const photoCategories = [
  ["HALL", "Hall"],
  ["KITCHEN", "Kitchen"],
  ["WASHROOM", "Washroom"],
  ["BEDROOM", "Bedroom"],
  ["OTHER", "Other areas"],
];

export default function EditListingForm({ token, listing, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    city: listing.city,
    locality: listing.locality,
    pincode: listing.pincode || "",
    flat_type: listing.flat_type,
    available_beds: String(listing.available_beds),
    occupants_count: String(listing.occupants_count ?? 0),
    monthly_rent: String(listing.monthly_rent),
    rent_basis: listing.rent_basis || "PER_PERSON",
    security_deposit: listing.security_deposit == null
      ? ""
      : String(listing.security_deposit),
    deposit_same_as_rent: listing.security_deposit != null && listing.security_deposit === listing.monthly_rent,
    furnishing_status: listing.furnishing_status || (listing.is_furnished ? "FURNISHED" : "UNFURNISHED"),
    available_for: listing.available_for || "ANY",
    brokerage: String(listing.brokerage ?? 0),
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState(listing.photos || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const previewUrlsRef = useRef([]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function choosePhotos(category, selected) {
    const otherPhotos = newPhotos.filter((photo) => photo.category !== category);
    const capacity = 12 - existingPhotos.length - otherPhotos.length;
    if (selected.length > capacity) {
      setMessage(`A listing can have up to 12 photos. You can add ${capacity} more.`);
      return;
    }
    newPhotos.filter((photo) => photo.category === category).forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl);
      previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
    });
    const added = selected.map((file) => ({ file, category, previewUrl: URL.createObjectURL(file) }));
    previewUrlsRef.current.push(...added.map((photo) => photo.previewUrl));
    const next = [...otherPhotos, ...added];
    setNewPhotos(next);
    setPreviewUrls(next.map((photo) => photo.previewUrl));
    setMessage("");
  }

  function removeNewPhoto(photo) {
    URL.revokeObjectURL(photo.previewUrl);
    previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
    const next = newPhotos.filter((item) => item.previewUrl !== photo.previewUrl);
    setNewPhotos(next);
    setPreviewUrls(next.map((item) => item.previewUrl));
    setMessage("");
  }

  async function removePhoto(photo) {
    if (!window.confirm("Remove this photo from your listing?")) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteListingImage(token, listing.id, photo.id);
      setExistingPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
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
    covered: existingPhotos.some((photo) => photo.category === category) || newPhotos.some((photo) => photo.category === category),
  }));
  const coveredPhotoAreas = keyPhotoAreas.filter((area) => area.covered).length;

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const { deposit_same_as_rent, ...listingFields } = form;
      const updated = await updateListing(token, listing.id, {
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
      if (newPhotos.length) {
        await uploadListingImages(token, listing.id, newPhotos);
      }
      onSaved(updated);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="edit-listing-form" onSubmit={save}>
      <label>
        Title
        <input name="title" value={form.title} onChange={update} minLength={5} required />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={update}
          minLength={20}
          rows={4}
          required
        />
      </label>

      <div className="listing-form-row">
        <label>
          City
          <input name="city" value={form.city} onChange={update} required />
        </label>
        <label>
          Locality
          <input name="locality" value={form.locality} onChange={update} required />
        </label>
      </div>

      <div className="listing-form-row">
        <label>
          Flat type
          <input name="flat_type" value={form.flat_type} onChange={update} required />
        </label>
        <label>
          Pincode
          <input
            name="pincode"
            value={form.pincode}
            onChange={update}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
          />
        </label>
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
            required
          />
        </label>
      </div>

      <div className="listing-form-row listing-form-numbers">
        <div className="deposit-field">
          <label htmlFor="edit-security-deposit">Security deposit (₹)</label>
          <input
            id="edit-security-deposit"
            name="security_deposit"
            type="number"
            min="0"
            value={form.deposit_same_as_rent ? form.monthly_rent : form.security_deposit}
            disabled={form.deposit_same_as_rent}
            onChange={update}
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

      <section className="edit-photo-section">
        <h3>Listing photos</h3>
        <p>{existingPhotos.length + newPhotos.length} of 12 photos added. Add photos by area, or remove existing photos.</p>
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
        {existingPhotos.length > 0 && (
          <div className="edit-photo-grid">
            {existingPhotos.map((photo) => (
              <div className="edit-photo-item" key={photo.id}>
                <img src={getImageUrl(photo.image_url)} alt="Current room" />
                <small>{photoCategories.find(([category]) => category === photo.category)?.[1] || "Other areas"}</small>
                <button type="button" onClick={() => removePhoto(photo)} disabled={busy}>Remove</button>
              </div>
            ))}
          </div>
        )}
        {existingPhotos.length + newPhotos.length < 12 && (
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
                <small>{newPhotos.filter((photo) => photo.category === category).length} new selected</small>
              </label>
            ))}
          </div>
        )}
        {previewUrls.length > 0 && (
          <div className="photo-preview-grid">
            {newPhotos.map((photo, index) => (
              <div className="photo-preview-item" key={photo.previewUrl}>
                <img src={photo.previewUrl} alt={`${photoCategories.find(([category]) => category === photo.category)?.[1]} photo ${index + 1}`} />
                <small>{photoCategories.find(([category]) => category === photo.category)?.[1]}</small>
                <button type="button" className="photo-preview-remove" onClick={() => removeNewPhoto(photo)} aria-label={`Remove ${photoCategories.find(([category]) => category === photo.category)?.[1]} photo ${index + 1}`}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {message && <p className="message" role="alert">{message}</p>}

      <div className="edit-form-actions">
        <button disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="cancel-edit" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
