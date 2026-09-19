import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signup, confirmSignup, resendSignupCode, login } = useScout();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finishLogin() {
    await login(email, password, { completeOnboarding: false });
    navigate("/onboarding");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsCode) {
        await confirmSignup(email, code);
        await finishLogin();
        return;
      }

      const result = await signup(name, email, password);
      if (result.confirmationRequired) {
        setNeedsCode(true);
        return;
      }
      await finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await resendSignupCode(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <h1 className="h1">{needsCode ? "Confirm email" : "Create account"}</h1>
        <p className="subtitle">
          {needsCode
            ? `Enter the code sent to ${email}.`
            : "Then pick shops for sale to watch."}
        </p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {needsCode ? (
            <label className="field">
              <span>Confirmation code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
              />
            </label>
          ) : (
            <>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8+ chars, upper, lower, number"
                />
              </label>
            </>
          )}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? (needsCode ? "Confirming…" : "Creating…") : needsCode ? "Confirm" : "Sign up"}
          </button>
          {needsCode ? (
            <button className="link" type="button" disabled={busy} onClick={() => void resend()}>
              Resend code
            </button>
          ) : null}
        </form>

        <p className="welcome-login">
          Already have an account?{" "}
          <button className="link welcome-login-link" type="button" onClick={() => navigate("/login")}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
