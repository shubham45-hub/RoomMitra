import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import ListingsPage from "./components/ListingsPage";
import ProfileForm from "./components/ProfileForm";
import { getProfile } from "./services/profile";
import MyListingsPage from "./components/MyListingsPage";
import InquiriesPage from "./components/InquiriesPage";
import "./App.css";

const TOKEN_KEY = "roommitra_token";

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("listings");

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then(setProfile)
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
      });
  }, [token]);

  function signedIn(accessToken, user) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setProfile(user);
    setScreen("listings");
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProfile(null);
  }

  if (!token) {
    return <main className="page"><AuthForm onSignedIn={signedIn} /></main>;
  }

  if (!profile) {
    return <main className="page"><p>Loading your profile…</p></main>;
  }

  if (screen === "my-listings") {
  return (
    <MyListingsPage
      token={token}
      onBack={() => setScreen("listings")}
    />
  );
}

  if (screen === "inquiries") {
    return <InquiriesPage token={token} onBack={() => setScreen("listings")} />;
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
      onProfile={() => setScreen("profile")}
      onMyListings={() => setScreen("my-listings")}
      onInquiries={() => setScreen("inquiries")}
      onSignOut={signOut}
    />
  );
}
