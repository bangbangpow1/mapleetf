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
    // Absolute path for GitHub Pages deployment
    navigator.serviceWorker
      .register("/mapleetf/sw.js", { scope: "/mapleetf/" })
      .then((reg) => {
        console.log("✅ Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.log("Service Worker registration failed (expected in dev):", err);
      });
  });
}
