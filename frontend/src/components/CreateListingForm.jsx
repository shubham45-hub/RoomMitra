import { useEffect, useRef, useState } from "react";
import { createListing, uploadListingImages } from "../services/listings";
import LocalityAutocomplete from "./LocalityAutocomplete";

const initialForm = {
  title: "",
  description: "",
  city: "",
  locality: "",
  pincode: "",
  flat_type: "",
  available_beds: "1",
  monthly_rent: "",
  security_deposit: "",
  is_furnished: false,
  brokerage: "0",
};

function emptyForm(preferredCity) {
  return { ...initialForm, city: preferredCity || "" };
}

export default function CreateListingForm({ token, preferredCity, onCreated, onCancel }) {
  const [form, setForm] = useState(() => emptyForm(preferredCity));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const previewUrlsRef = useRef([]);

  useEffect(() => {
    return () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function choosePhotos(selected) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const urls = selected.map((photo) => URL.createObjectURL(photo));
    previewUrlsRef.current = urls;
    setPreviewUrls(urls);
    setPhotos(selected);
  }

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const created = await createListing(token, {
        ...form,
        pincode: form.pincode.trim() || null,
        available_beds: Number(form.available_beds),
        monthly_rent: Number(form.monthly_rent),
        security_deposit: form.security_deposit
          ? Number(form.security_deposit)
          : null,
        brokerage: Number(form.brokerage || 0),
      });

      if (photos.length) {
        try {
          await uploadListingImages(token, created.id, photos);
        } catch (uploadError) {
          setForm(emptyForm(preferredCity));
          choosePhotos([]);
          onCreated(
            created,
            `Your listing was published, but its photos could not be uploaded: ${uploadError.message}`,
          );
          return;
        }
      }

      setForm(emptyForm(preferredCity));
      choosePhotos([]);
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
        </div>
        <button type="button" className="close-form" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="listing-form" onSubmit={submit}>
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
          <label htmlFor="listing-photos">Room and flat photos (up to 6)</label>
          <input
            id="listing-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              const selected = Array.from(event.target.files || []);
              if (selected.length > 6) {
                setPhotoError("Choose up to 6 photos.");
                event.target.value = "";
                choosePhotos([]);
                return;
              }
              setPhotoError("");
              choosePhotos(selected);
            }}
          />
          <p className="photo-help">JPEG, PNG, or WebP. Each photo must be 5 MB or smaller.</p>
          {photoError && <p className="message" role="alert">{photoError}</p>}
          {previewUrls.length > 0 && (
            <div className="photo-preview-grid">
              {previewUrls.map((url, index) => (
                <img src={url} alt={`Selected room photo ${index + 1}`} key={url} />
              ))}
            </div>
          )}
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

        <div className="listing-form-row listing-form-numbers">
          <label>
            Available beds
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

        <div className="listing-form-row">
          <label>
            Security deposit (₹)
            <input
              name="security_deposit"
              type="number"
              min="0"
              value={form.security_deposit}
              onChange={update}
              placeholder="Optional"
            />
          </label>
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
        </div>

        <label className="furnished-option">
          <input
            name="is_furnished"
            type="checkbox"
            checked={form.is_furnished}
            onChange={update}
          />
          <span>The room is furnished</span>
        </label>

        {message && <p className="message" role="alert">{message}</p>}

        <button className="publish-button" disabled={busy}>
          {busy ? "Publishing…" : "Publish listing"}
        </button>
      </form>
    </section>
  );
}
