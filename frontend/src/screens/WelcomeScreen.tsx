import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="screen welcome-screen">
      <div className="welcome-orb welcome-orb-a" />
      <div className="welcome-orb welcome-orb-b" />

      <div className="welcome-center">
        <div className="welcome-logo-wrap">
          <BrandLogo className="welcome-logo" />
        </div>
      </div>

      <div className="welcome-actions">
        <button className="btn btn-primary" onClick={() => navigate("/signup")}>
          Get Started
        </button>
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
