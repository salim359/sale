import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useScout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <h1 className="h1">Log in</h1>
        <p className="subtitle">Use the email and password you signed up with.</p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="welcome-login">
          New here?{" "}
          <button className="link welcome-login-link" type="button" onClick={() => navigate("/signup")}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
