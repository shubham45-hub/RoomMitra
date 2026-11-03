import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import ListingsPage from "./components/ListingsPage";
import ProfileForm from "./components/ProfileForm";
import { getProfile } from "./services/profile";
import MyListingsPage from "./components/MyListingsPage";
import InquiriesPage from "./components/InquiriesPage";
import ModerationPage from "./components/ModerationPage";
import PublicInfoPage from "./components/PublicInfoPage";
import SiteFooter from "./components/SiteFooter";
import { getModerationAccess } from "./services/listings";
import DemoPreview from "./components/DemoPreview";
import "./App.css";

const TOKEN_KEY = "roommitra_token";
const IS_DEMO_PREVIEW = new URLSearchParams(window.location.search).get("demo") === "1";

export default function App() {
  const [token, setToken] = useState(() => IS_DEMO_PREVIEW ? null : sessionStorage.getItem(TOKEN_KEY));
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("listings");
  const [publicPage, setPublicPage] = useState(null);
  const [canModerate, setCanModerate] = useState(false);

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then((loadedProfile) => {
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
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
      });
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
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setProfile(user);
    setCanModerate(false);
    setScreen("listings");
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProfile(null);
    setCanModerate(false);
  }

  if (IS_DEMO_PREVIEW) return <DemoPreview />;

  if (publicPage) {
    return (
      <PublicInfoPage
        page={publicPage}
        onNavigate={setPublicPage}
        onBack={() => setPublicPage(null)}
      />
    );
  }

  if (!token) {
    return (
      <main className="page">
        <AuthForm onSignedIn={signedIn} />
        <SiteFooter onNavigate={setPublicPage} />
      </main>
    );
  }

  if (!profile) {
    return <main className="page"><p>Loading your profile…</p></main>;
  }

  const needsOnboarding =
    !profile.preferred_city ||
    !profile.email ||
    !profile.sex ||
    !profile.religion ||
    !profile.origin_state ||
    !profile.name ||
    profile.name === "RoomMitra user";

  if (needsOnboarding) {
    return (
      <main className="page">
        <ProfileForm
          profile={profile}
          token={token}
          onSaved={setProfile}
          onSignOut={signOut}
          onboarding
        />
      </main>
    );
  }

  if (screen === "my-listings") {
  return (
    <MyListingsPage
      token={token}
      userId={profile.id}
      onBack={() => setScreen("listings")}
    />
  );
}

  if (screen === "inquiries") {
    return <InquiriesPage token={token} onBack={() => setScreen("listings")} />;
  }

  if (screen === "moderation" && canModerate) {
    return <ModerationPage token={token} onBack={() => setScreen("listings")} />;
  }

  if (screen === "profile") {
    return (
      <main className="page">
        <ProfileForm
          profile={profile}
          token={token}
          onSaved={setProfile}
          onSignOut={signOut}
          onBack={() => setScreen("listings")}
        />
      </main>
    );
  }

  return (
    <ListingsPage
      token={token}
      userId={profile.id}
      profile={profile}
      preferredCity={profile.preferred_city}
      onProfile={() => setScreen("profile")}
      onMyListings={() => setScreen("my-listings")}
      onInquiries={() => setScreen("inquiries")}
      onModeration={() => setScreen("moderation")}
      canModerate={canModerate}
      onSignOut={signOut}
      onPublicPage={setPublicPage}
    />
  );
}
