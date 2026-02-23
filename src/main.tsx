import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Service Worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Use relative path so it works on any base URL (GitHub Pages, Netlify, etc.)
    const swPath = new URL("./sw.js", window.location.href).href;
    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        console.log("✅ Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.log("Service Worker registration failed (expected in dev):", err);
      });
  });
}
