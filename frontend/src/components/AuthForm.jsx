import { useState } from "react";
import {
  confirmPasswordReset,
  requestPasswordReset,
  signIn,
  signUp,
} from "../services/auth";

export default function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "signup";
  const isResetRequest = mode === "reset-request";
  const isResetConfirm = mode === "reset-confirm";
  const isReset = isResetRequest || isResetConfirm;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (isResetRequest) {
        await sendResetCode();
        setMode("reset-confirm");
        return;
      }

      if (isResetConfirm) {
        const result = await confirmPasswordReset(phone, code, password);
        setMode("signin");
        setPassword("");
        setCode("");
        setMessage(result.detail);
        return;
      }

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

  async function resendCode() {
    setBusy(true);
    setMessage("");
    setCode("");
    try {
      await sendResetCode();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setCode("");
  }

  const title = isSignUp
    ? "Create your account"
    : isReset
      ? "Reset your password"
      : "Find your place";

  async function sendResetCode() {
    const result = await requestPasswordReset(phone);
    setMessage(
      result.development_code
        ? `Development reset code: ${result.development_code}`
        : result.detail,
    );
  }

  return (
    <section className="card">
      <p className="eyebrow">ROOMMITRA</p>
      <h1>{title}</h1>
      <p className="intro">
        {isSignUp
          ? "Sign up with your Indian mobile number and a password."
          : isReset
            ? isResetRequest
              ? "We’ll send a one-time reset code to your registered mobile number."
              : "Enter the code sent to your mobile and choose a new password."
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
          readOnly={isResetConfirm}
        />

        {isResetConfirm && (
          <>
            <label htmlFor="reset-code">6-digit reset code</label>
            <input
              id="reset-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter reset code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </>
        )}

        {!isResetRequest && (
          <>
            <label htmlFor="password">{isResetConfirm ? "New password" : "Password"}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isResetConfirm || isSignUp ? "At least 8 characters" : "Enter your password"}
              autoComplete={isResetConfirm || isSignUp ? "new-password" : "current-password"}
              minLength={isSignUp || isResetConfirm ? 8 : 1}
              maxLength={128}
              required
            />
          </>
        )}

        <button disabled={busy}>
          {busy
            ? "Please wait…"
            : isResetRequest
              ? "Send reset code"
              : isResetConfirm
                ? "Reset password"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
        </button>
      </form>

      {mode === "signin" && (
        <button
          type="button"
          className="text-button"
          onClick={() => switchMode("reset-request")}
          disabled={busy}
        >
          Forgot password?
        </button>
      )}
      {isResetConfirm && (
        <button
          type="button"
          className="text-button"
          onClick={resendCode}
          disabled={busy}
        >
          Resend reset code
        </button>
      )}
      {!isReset && (
        <button
          type="button"
          className="text-button"
          onClick={() => switchMode(isSignUp ? "signin" : "signup")}
          disabled={busy}
        >
          {isSignUp ? "Already have an account? Sign in" : "New to RoomMitra? Create an account"}
        </button>
      )}
      {isReset && (
        <button
          type="button"
          className="text-button"
          onClick={() => switchMode("signin")}
          disabled={busy}
        >
          Back to sign in
        </button>
      )}

      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}
