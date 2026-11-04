import { useCallback, useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import ListingsPage from "./components/ListingsPage";
import ProfileForm from "./components/ProfileForm";
import { getProfile, primeProfileCache } from "./services/profile";
import MyListingsPage from "./components/MyListingsPage";
import InquiriesPage from "./components/InquiriesPage";
import ModerationPage from "./components/ModerationPage";
import PublicInfoPage from "./components/PublicInfoPage";
import SiteFooter from "./components/SiteFooter";
import { getModerationAccess } from "./services/listings";
import { clearRequestCache } from "./services/requestCache";
import DemoPreview from "./components/DemoPreview";
import AppTour from "./components/AppTour";
import "./App.css";

const TOKEN_KEY = "roommitra_token";
const TOUR_PENDING_KEY = "roommitra_tour_pending_user";
const THEME_KEY = "roommitra_theme";
const IS_DEMO_PREVIEW = new URLSearchParams(window.location.search).get("demo") === "1";

function ThemeToggle({ theme, onToggle, fixed = false }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className={`theme-toggle${fixed ? " is-fixed" : ""}`}
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      {isDark ? "Light" : "Dark"}
    </button>
  );
}

function needsOnboarding(profile) {
  return !profile?.preferred_city ||
    !profile?.email ||
    !profile?.sex ||
    !profile?.religion ||
    !profile?.origin_state ||
    !profile?.name ||
    profile.name === "RoomMitra user";
}

export default function App() {
  const [token, setToken] = useState(() => IS_DEMO_PREVIEW ? null : sessionStorage.getItem(TOKEN_KEY));
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("listings");
  const [visitedScreens, setVisitedScreens] = useState(() => new Set(["listings"]));
  const [publicPage, setPublicPage] = useState(null);
  const [canModerate, setCanModerate] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");

  const navigateTo = useCallback((nextScreen) => {
    setVisitedScreens((current) => new Set(current).add(nextScreen));
    setScreen(nextScreen);
  }, []);
  const goToListings = useCallback(() => navigateTo("listings"), [navigateTo]);
  const goToProfile = useCallback(() => navigateTo("profile"), [navigateTo]);
  const goToMyListings = useCallback(() => navigateTo("my-listings"), [navigateTo]);
  const goToInquiries = useCallback(() => navigateTo("inquiries"), [navigateTo]);
  const goToModeration = useCallback(() => navigateTo("moderation"), [navigateTo]);
  const toggleTheme = useCallback(() => {
    setTheme((current) => current === "dark" ? "light" : "dark");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#101713" : "#f5f7f2",
    );
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getProfile(token)
      .then((loadedProfile) => {
        if (cancelled) return;
        setProfile((currentProfile) => {
          if (!currentProfile) return loadedProfile;
          const merged = { ...currentProfile, ...loadedProfile };
          // Keep profile fields from OTP verification if a briefly stale API
          // response does not include fields added by a newer backend version.
          for (const key of ["email", "preferred_city", "sex", "religion", "origin_state", "avatar_url"]) {
            if (loadedProfile[key] == null && currentProfile[key] != null) {
              merged[key] = currentProfile[key];
            }
          }
          return merged;
        });
      })
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    getModerationAccess(token)
      .then((access) => {
        if (!cancelled) setCanModerate(access.can_moderate);
      })
      .catch(() => {
        if (!cancelled) setCanModerate(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  function signedIn(accessToken, user) {
    clearRequestCache();
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    if (user) primeProfileCache(accessToken, user);
    if (user?.id && needsOnboarding(user)) {
      sessionStorage.setItem(TOUR_PENDING_KEY, String(user.id));
    } else {
      sessionStorage.removeItem(TOUR_PENDING_KEY);
    }
    setToken(accessToken);
    setProfile(user);
    setCanModerate(false);
    setTourDismissed(false);
    setVisitedScreens(new Set(["listings"]));
    setScreen("listings");
  }

  function signOut() {
    clearRequestCache();
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOUR_PENDING_KEY);
    setToken(null);
    setProfile(null);
    setCanModerate(false);
    setTourDismissed(false);
    setVisitedScreens(new Set(["listings"]));
    setScreen("listings");
  }

  function finishTour() {
    if (profile?.id) {
      localStorage.setItem(`roommitra_tour_seen_${profile.id}`, "true");
    }
    sessionStorage.removeItem(TOUR_PENDING_KEY);
    setTourDismissed(true);
    navigateTo("listings");
  }

  if (IS_DEMO_PREVIEW) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <DemoPreview />
      </>
    );
  }

  if (!token && !publicPage) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <main className="page">
          <AuthForm onSignedIn={signedIn} />
          <SiteFooter onNavigate={setPublicPage} />
        </main>
      </>
    );
  }

  if (!token && publicPage) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <PublicInfoPage
          page={publicPage}
          onNavigate={setPublicPage}
          onBack={() => setPublicPage(null)}
        />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <main className="page"><p>Loading your profile…</p></main>
      </>
    );
  }

  if (needsOnboarding(profile)) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <main className="page">
          <ProfileForm
            profile={profile}
            token={token}
            onSaved={setProfile}
            onSignOut={signOut}
            onboarding
          />
        </main>
      </>
    );
  }

  const pendingTourUser = sessionStorage.getItem(TOUR_PENDING_KEY);
  const tourWasSeen = localStorage.getItem(`roommitra_tour_seen_${profile.id}`) === "true";
  const showTour = pendingTourUser === String(profile.id) && !tourWasSeen && !tourDismissed;

  if (showTour) {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} fixed />
        <AppTour onSkip={finishTour} onFinish={finishTour} />
      </>
    );
  }

  return (
    <>
      <ThemeToggle theme={theme} onToggle={toggleTheme} fixed={screen !== "listings" || Boolean(publicPage)} />
      {publicPage && (
        <PublicInfoPage
          page={publicPage}
          onNavigate={setPublicPage}
          onBack={() => setPublicPage(null)}
        />
      )}
      <div hidden={Boolean(publicPage) || screen !== "listings"}>
        <ListingsPage
          token={token}
          userId={profile.id}
          profile={profile}
          preferredCity={profile.preferred_city}
          onProfile={goToProfile}
          onMyListings={goToMyListings}
          onInquiries={goToInquiries}
          onModeration={goToModeration}
          canModerate={canModerate}
          onSignOut={signOut}
          onPublicPage={setPublicPage}
          active={screen === "listings"}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
      {visitedScreens.has("my-listings") && (
        <div hidden={Boolean(publicPage) || screen !== "my-listings"}>
          <MyListingsPage
            token={token}
            userId={profile.id}
            onBack={goToListings}
            active={screen === "my-listings"}
          />
        </div>
      )}
      {visitedScreens.has("inquiries") && (
        <div hidden={Boolean(publicPage) || screen !== "inquiries"}>
          <InquiriesPage token={token} onBack={goToListings} />
        </div>
      )}
      {visitedScreens.has("moderation") && canModerate && (
        <div hidden={Boolean(publicPage) || screen !== "moderation"}>
          <ModerationPage token={token} onBack={goToListings} />
        </div>
      )}
      {visitedScreens.has("profile") && (
        <div hidden={Boolean(publicPage) || screen !== "profile"}>
          <main className="page">
            <ProfileForm
              profile={profile}
              token={token}
              onSaved={setProfile}
              onSignOut={signOut}
              onBack={goToListings}
            />
          </main>
        </div>
      )}
    </>
  );
}
