import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerVersionedSW } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

// Register the versioned service worker (skips iframes & preview hosts internally)
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    registerVersionedSW().catch(() => {});
  });
}
