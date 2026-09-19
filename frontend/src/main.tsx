import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ScoutProvider } from "./context/ScoutContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ScoutProvider>
        <App />
      </ScoutProvider>
    </BrowserRouter>
  </StrictMode>,
);
