import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  IconBookmark,
  IconHome,
  IconSearch,
  IconUser,
} from "./components/Icons";
import { useScout } from "./context/ScoutContext";
import AboutScreen from "./screens/AboutScreen";
import HelpSupportScreen from "./screens/HelpSupportScreen";
import HomeScreen from "./screens/HomeScreen";
import ItemScreen from "./screens/ItemScreen";
import LoginScreen from "./screens/LoginScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import OnboardingShopsScreen from "./screens/OnboardingShopsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SavedScreen from "./screens/SavedScreen";
import SearchScreen from "./screens/SearchScreen";
import ShopScreen from "./screens/ShopScreen";
import SignupScreen from "./screens/SignupScreen";
import WelcomeScreen from "./screens/WelcomeScreen";

const TAB_ROUTES = ["/", "/saved", "/search", "/profile"];

export default function App() {
  const { onboarded } = useScout();
  const location = useLocation();
  const showTabs = TAB_ROUTES.includes(location.pathname);

  return (
    <div className="app-root">
      <div className="phone">
        <div className="stage">
          <Routes>
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/onboarding" element={<OnboardingShopsScreen />} />
          <Route
            path="/"
            element={onboarded ? <HomeScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/saved"
            element={onboarded ? <SavedScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/search"
            element={onboarded ? <SearchScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/profile"
            element={onboarded ? <ProfileScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/shop/:shopId"
            element={onboarded ? <ShopScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/item"
            element={onboarded ? <ItemScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/notifications"
            element={onboarded ? <NotificationsScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/help"
            element={onboarded ? <HelpSupportScreen /> : <Navigate to="/welcome" replace />}
          />
          <Route
            path="/about"
            element={onboarded ? <AboutScreen /> : <Navigate to="/welcome" replace />}
          />
          </Routes>
        </div>

        {showTabs && onboarded && (
          <nav className="tabbar">
            <NavLink to="/" end className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
              <IconHome />
              Home
            </NavLink>
            <NavLink to="/saved" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
              <IconBookmark />
              Saved
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
              <IconSearch />
              Search
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
              <IconUser />
              Profile
            </NavLink>
          </nav>
        )}
      </div>
    </div>
  );
}
