import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getImageUrl } from "../services/api";

function PhotoGallery({ photoUrls = [], photoCategories = [], title, variant = "card" }) {
  const photos = useMemo(
    () => photoUrls
      .map((url, index) => ({ url, category: photoCategories[index] }))
      .filter((photo) => photo.url),
    [photoCategories, photoUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const safeActiveIndex = photos.length ? activeIndex % photos.length : 0;
  const activePhoto = photos[safeActiveIndex];
  const categoryLabel = useMemo(() => ({
    HALL: "Hall",
    KITCHEN: "Kitchen",
    WASHROOM: "Washroom",
    BEDROOM: "Bedroom",
    OTHER: "Other area",
  })[activePhoto?.category?.toUpperCase()], [activePhoto?.category]);

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % photos.length);
  }, [photos.length]);

  const closeViewer = useCallback(() => setIsOpen(false), []);
  const openViewer = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    function handleKeyDown(event) {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [closeViewer, isOpen, showNext, showPrevious]);

  const viewer = isOpen && photos.length > 0 && createPortal(
      <div className="photo-viewer-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeViewer();
      }}>
        <section className="photo-viewer" role="dialog" aria-modal="true" aria-label={`Photos for ${title}`}>
          <button type="button" className="photo-viewer-close" onClick={closeViewer} aria-label="Close photo viewer">×</button>
          {photos.length > 1 && (
            <button type="button" className="photo-viewer-arrow previous" onClick={showPrevious} aria-label="Previous photo">‹</button>
          )}
          <img src={getImageUrl(activePhoto.url)} alt={`${title}, photo ${safeActiveIndex + 1} of ${photos.length}`} />
          {categoryLabel && <span className="photo-viewer-category">{categoryLabel}</span>}
          {photos.length > 1 && (
            <button type="button" className="photo-viewer-arrow next" onClick={showNext} aria-label="Next photo">›</button>
          )}
          <p className="photo-viewer-count">{safeActiveIndex + 1} of {photos.length}</p>
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
          onClick={openViewer}
          aria-label={`View photos for ${title}, photo ${safeActiveIndex + 1} of ${photos.length}`}
        >
          <img
            src={getImageUrl(activePhoto.url)}
            alt={`${title}, photo ${safeActiveIndex + 1} of ${photos.length}`}
            loading={variant === "card" || variant === "my-listing" ? "lazy" : "eager"}
          />
          {categoryLabel && <span className="photo-gallery-category">{categoryLabel}</span>}
          <span className="photo-gallery-count">{safeActiveIndex + 1} / {photos.length}</span>
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

export default memo(PhotoGallery);
