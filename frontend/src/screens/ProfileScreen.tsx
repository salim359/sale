import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconBookmark,
  IconChevron,
  IconGear,
  IconHeart,
  IconTag,
  IconUser,
} from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { profile, logout, saved, selected, alertsEnabled, setAlertsEnabled } = useScout();
  const person = profile ?? { name: "", email: "" };
  const initials = person.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader
          right={
            <button className="icon-btn plain" type="button" aria-label="Settings">
              <IconGear />
            </button>
          }
        />

        <div className="profile-head">
          <span className="avatar profile-avatar">
            {initials}
          </span>
          <h2 className="h2">{person.name}</h2>
          <p className="muted">{person.email}</p>
        </div>

        <div className="menu">
          <button className="menu-item" onClick={() => navigate("/search")}>
            <IconTag size={20} />
            <span>My Favourite Shops</span>
            <small className="muted">{selected.length}</small>
            <IconChevron />
          </button>
          <button className="menu-item" onClick={() => navigate("/saved")}>
            <IconHeart size={20} />
            <span>Saved Items</span>
            <small className="muted">{saved.length}</small>
            <IconChevron />
          </button>
          <button className="menu-item" onClick={() => setAlertsEnabled(!alertsEnabled)}>
            <IconBookmark size={20} />
            <span>Price Alerts</span>
            <small className="muted">{alertsEnabled ? "On" : "Off"}</small>
            <IconChevron />
          </button>
          <button className="menu-item" onClick={() => navigate("/notifications")}>
            <IconBell size={20} />
            <span>Notification Settings</span>
            <IconChevron />
          </button>
          <button className="menu-item" onClick={() => navigate("/help")}>
            <IconUser size={20} />
            <span>Help & Support</span>
            <IconChevron />
          </button>
          <button className="menu-item" onClick={() => navigate("/about")}>
            <IconGear size={20} />
            <span>About sale</span>
            <IconChevron />
          </button>
        </div>

        <button
          className="btn btn-logout"
          onClick={() => {
            logout();
            navigate("/welcome");
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
