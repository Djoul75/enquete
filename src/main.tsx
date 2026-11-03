import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});

  // Le jeu s'ouvre depuis le cache du téléphone ; quand une nouvelle version
  // est arrivée entre-temps, on la prend au prochain retour dans l'app, sauf
  // en pleine enquête ou au bureau pour ne rien interrompre.
  let nouvelleVersion = false;
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data === "nouvelle-version") nouvelleVersion = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !nouvelleVersion) return;
    if (/^#\/(p|bureau|preparer)\//.test(window.location.hash + "/")) return;
    window.location.reload();
  });
}
