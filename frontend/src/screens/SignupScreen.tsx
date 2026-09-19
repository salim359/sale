import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signup } = useScout();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(name, email, password);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <h1 className="h1">Create account</h1>
        <p className="subtitle">Then pick shops for sale to watch.</p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
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
              placeholder="At least 6 characters"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Sign up"}
          </button>
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
