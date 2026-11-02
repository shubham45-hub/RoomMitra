import { useEffect, useRef, useState } from "react";
import {
  deleteListingImage,
  updateListing,
  uploadListingImages,
} from "../services/listings";
import { getImageUrl } from "../services/api";

export default function EditListingForm({ token, listing, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    city: listing.city,
    locality: listing.locality,
    pincode: listing.pincode || "",
    flat_type: listing.flat_type,
    available_beds: String(listing.available_beds),
    monthly_rent: String(listing.monthly_rent),
    security_deposit: listing.security_deposit == null
      ? ""
      : String(listing.security_deposit),
    is_furnished: listing.is_furnished,
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

  function choosePhotos(selected) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const urls = selected.map((photo) => URL.createObjectURL(photo));
    previewUrlsRef.current = urls;
    setPreviewUrls(urls);
    setNewPhotos(selected);
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

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const updated = await updateListing(token, listing.id, {
        ...form,
        pincode: form.pincode.trim() || null,
        available_beds: Number(form.available_beds),
        monthly_rent: Number(form.monthly_rent),
        security_deposit: form.security_deposit
          ? Number(form.security_deposit)
          : null,
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

      <div className="listing-form-row">
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

      <section className="edit-photo-section">
        <h3>Listing photos</h3>
        <p>{existingPhotos.length} of 6 photos added. You can remove photos or add more.</p>
        {existingPhotos.length > 0 && (
          <div className="edit-photo-grid">
            {existingPhotos.map((photo) => (
              <div className="edit-photo-item" key={photo.id}>
                <img src={getImageUrl(photo.image_url)} alt="Current room" />
                <button type="button" onClick={() => removePhoto(photo)} disabled={busy}>Remove</button>
              </div>
            ))}
          </div>
        )}
        {existingPhotos.length < 6 && (
          <label>
            Add photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                const available = 6 - existingPhotos.length;
                if (selected.length > available) {
                  setMessage(`You can add ${available} more photo${available === 1 ? "" : "s"}.`);
                  event.target.value = "";
                  choosePhotos([]);
                  return;
                }
                setMessage("");
                choosePhotos(selected);
              }}
            />
          </label>
        )}
        {previewUrls.length > 0 && (
          <div className="photo-preview-grid">
            {previewUrls.map((url, index) => (
              <img src={url} alt={`New room photo ${index + 1}`} key={url} />
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
