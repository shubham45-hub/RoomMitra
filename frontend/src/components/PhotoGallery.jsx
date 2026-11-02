import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getImageUrl } from "../services/api";

export default function PhotoGallery({ photoUrls = [], title, variant = "card" }) {
  const photos = photoUrls.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % photos.length);
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % photos.length);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isOpen, photos.length]);

  const viewer = isOpen && createPortal(
      <div className="photo-viewer-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}>
        <section className="photo-viewer" role="dialog" aria-modal="true" aria-label={`Photos for ${title}`}>
          <button type="button" className="photo-viewer-close" onClick={() => setIsOpen(false)} aria-label="Close photo viewer">×</button>
          {photos.length > 1 && (
            <button type="button" className="photo-viewer-arrow previous" onClick={showPrevious} aria-label="Previous photo">‹</button>
          )}
          <img src={getImageUrl(photos[activeIndex])} alt={`${title}, photo ${activeIndex + 1} of ${photos.length}`} />
          {photos.length > 1 && (
            <button type="button" className="photo-viewer-arrow next" onClick={showNext} aria-label="Next photo">›</button>
          )}
          <p className="photo-viewer-count">{activeIndex + 1} of {photos.length}</p>
        </section>
      </div>,
      document.body,
    );

  if (!photos.length) {
    return (
      <div className={`listing-photo-placeholder ${variant}`}>
        <span className="photo-placeholder-icon" aria-hidden="true">⌂</span>
        <strong>No photos yet</strong>
        <span>Room photos haven’t been added</span>
      </div>
    );
  }

  return (
    <>
      <div className={`photo-gallery ${variant}`}>
        <button
          type="button"
          className="photo-gallery-open"
          onClick={() => setIsOpen(true)}
          aria-label={`View photos for ${title}, photo ${activeIndex + 1} of ${photos.length}`}
        >
          <img
            src={getImageUrl(photos[activeIndex])}
            alt={`${title}, photo ${activeIndex + 1} of ${photos.length}`}
            loading={variant === "card" || variant === "my-listing" ? "lazy" : "eager"}
          />
          <span className="photo-gallery-count">{activeIndex + 1} / {photos.length}</span>
          <span className="photo-gallery-hint">Click to view photos</span>
        </button>
        {photos.length > 1 && (
          <>
            <button type="button" className="photo-gallery-arrow previous" onClick={showPrevious} aria-label="Previous photo">‹</button>
            <button type="button" className="photo-gallery-arrow next" onClick={showNext} aria-label="Next photo">›</button>
          </>
        )}
      </div>

      {viewer}
    </>
  );
}
