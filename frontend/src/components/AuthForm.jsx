import { useState } from "react";
import { signIn, signUp } from "../services/auth";

export default function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const result = isSignUp
        ? await signUp({ name, phone, password })
        : await signIn(phone, password);
      onSignedIn(result.access_token, result.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isSignUp ? "signin" : "signup");
    setMessage("");
  }

  return (
    <section className="card">
      <p className="eyebrow">ROOMMITRA</p>
      <h1>{isSignUp ? "Create your account" : "Find your place"}</h1>
      <p className="intro">
        {isSignUp
          ? "Sign up with your Indian mobile number and a password."
          : "Sign in with your mobile number and password."}
      </p>

      <form onSubmit={submit}>
        {isSignUp && (
          <>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              maxLength={100}
              required
            />
          </>
        )}

        <label htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="98765 43210"
          autoComplete="tel"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={isSignUp ? 8 : 1}
          maxLength={128}
          required
        />

        <button disabled={busy}>
          {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button type="button" className="text-button" onClick={switchMode} disabled={busy}>
        {isSignUp ? "Already have an account? Sign in" : "New to RoomMitra? Create an account"}
      </button>

      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}
