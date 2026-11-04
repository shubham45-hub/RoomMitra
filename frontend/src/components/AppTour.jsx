import { useState } from "react";

const tourSteps = [
  {
    eyebrow: "FIND YOUR PLACE",
    icon: "⌕",
    title: "Start with the city you want to call home.",
    description: "RoomMitra shows rooms and shared flats in your preferred city. Narrow the search by locality, budget, flat type, beds, and furnishing.",
    previewLabel: "YOUR CITY, YOUR SEARCH",
    previewTitle: "Find a room that feels like yours",
    previewTags: ["Locality", "Monthly rent", "2BHK"],
  },
  {
    eyebrow: "COMPARE WITH CONFIDENCE",
    icon: "⌂",
    title: "See the details before you decide.",
    description: "Every listing shows its current availability, rent, occupancy, furnishing, photos, and how many people have viewed or contacted the lister.",
    previewLabel: "LISTING DETAILS",
    previewTitle: "Room available in Newtown",
    previewTags: ["Available", "₹6,000 / month", "1 person needed"],
  },
  {
    eyebrow: "SAVE & CONNECT",
    icon: "♡",
    title: "Keep favourites close and contact the lister.",
    description: "Save homes to revisit later, then open a listing to ask the lister a question. Your phone number is shared only when you agree.",
    previewLabel: "A BETTER WAY TO CONNECT",
    previewTitle: "Message the lister",
    previewTags: ["Saved homes", "Verified contact", "Your choice"],
  },
  {
    eyebrow: "SHARE A ROOM",
    icon: "+",
    title: "Have a space to share? Post it in minutes.",
    description: "Add rent, availability, flat details, and up to 12 photos. Manage, edit, pause, or mark your listing filled from My listings.",
    previewLabel: "YOUR ROOMMITRA POSTS",
    previewTitle: "A clear listing helps the right person find you",
    previewTags: ["Up to 12 photos", "Manage anytime", "Your listing"],
  },
  {
    eyebrow: "STAY IN THE LOOP",
    icon: "↗",
    title: "Your RoomMitra tools are all in one place.",
    description: "Use Inquiries to reply to interested people, Saved homes to keep your shortlist, and My profile to update your city and details.",
    previewLabel: "READY WHEN YOU ARE",
    previewTitle: "A more comfortable way to find a flatmate",
    previewTags: ["Inquiries", "Saved homes", "My profile"],
  },
];

export default function AppTour({ onSkip, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = tourSteps[stepIndex];
  const isLastStep = stepIndex === tourSteps.length - 1;

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goForward() {
    if (isLastStep) {
      onFinish();
      return;
    }
    setStepIndex((current) => Math.min(tourSteps.length - 1, current + 1));
  }

  return (
    <div className="app-tour-backdrop">
      <section className="app-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="app-tour-title">
        <header className="app-tour-header">
          <div className="app-tour-brand" aria-label="RoomMitra">
            <span className="wordmark-icon">R</span>
            <span>RoomMitra</span>
          </div>
          <button type="button" className="app-tour-skip" onClick={onSkip}>Skip tour <span aria-hidden="true">×</span></button>
        </header>

        <div className="app-tour-body" key={stepIndex}>
          <div className="app-tour-story">
            <p className="app-tour-eyebrow"><span>{String(stepIndex + 1).padStart(2, "0")}</span>{step.eyebrow}</p>
            <h1 id="app-tour-title">{step.title}</h1>
            <p className="app-tour-description">{step.description}</p>
            <div className="app-tour-tip">
              <span aria-hidden="true">✦</span>
              <p>Take your time. You can explore everything after the tour.</p>
            </div>
          </div>

          <div className="app-tour-preview" aria-label={`Preview: ${step.previewTitle}`}>
            <div className="app-tour-preview-orb" />
            <div className="app-tour-preview-card">
              <div className="app-tour-preview-topline">
                <span className="app-tour-preview-mark">R</span>
                <span>{step.previewLabel}</span>
              </div>
              <div className="app-tour-preview-art">
                <span className="app-tour-preview-symbol" aria-hidden="true">{step.icon}</span>
                <span className="app-tour-preview-sun" />
                <span className="app-tour-preview-horizon" />
              </div>
              <h2>{step.previewTitle}</h2>
              <div className="app-tour-preview-tags">
                {step.previewTags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <div className="app-tour-preview-line" />
              <div className="app-tour-preview-line short" />
            </div>
            <span className="app-tour-preview-caption">A quick look around RoomMitra</span>
          </div>
        </div>

        <footer className="app-tour-footer">
          <div className="app-tour-progress" aria-label={`Step ${stepIndex + 1} of ${tourSteps.length}`}>
            <div className="app-tour-progress-track"><span style={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }} /></div>
            <span>{stepIndex + 1} <span aria-hidden="true">/</span> {tourSteps.length}</span>
          </div>
          <div className="app-tour-controls">
            <button type="button" className="app-tour-back" onClick={goBack} disabled={stepIndex === 0}>
              <span aria-hidden="true">←</span> Back
            </button>
            <button type="button" className="app-tour-next" onClick={goForward} aria-label={isLastStep ? "Finish tour and start exploring" : "Next tour step"}>
              {isLastStep ? "Start exploring" : "Next"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
