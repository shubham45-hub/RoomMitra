import { useState } from "react";
import { requestOtp, verifyOtp } from "../services/auth";

export default function AuthForm({ onSignedIn }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const result = await requestOtp(phone);
      setMessage(
        result.development_otp
          ? `Development OTP: ${result.development_otp}`
          : result.detail
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const result = await verifyOtp(phone, code);
      onSignedIn(result.access_token, result.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <p className="eyebrow">ROOMMITRA</p>
      <h1>Find your place</h1>
      <p className="intro">Sign in with your Indian mobile number.</p>

      <form onSubmit={sendCode}>
        <label htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="98765 43210"
          autoComplete="tel"
          required
        />
        <button disabled={busy}>
          {busy ? "Please wait…" : "Send OTP"}
        </button>
      </form>

      <form onSubmit={signIn} className="second-form">
        <label htmlFor="otp">6-digit OTP</label>
        <input
          id="otp"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter OTP"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
        <button className="secondary" disabled={busy}>
          Verify and sign in
        </button>
      </form>

      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}