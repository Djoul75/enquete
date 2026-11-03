import { useEffect, useState } from "react";

// Bandeau en haut de l'écran quand le téléphone n'a plus de réseau : le jeu
// reste affiché, mais rien ne part ni n'arrive tant qu'il n'est pas revenu.
export function HorsLigne() {
  const [enLigne, setEnLigne] = useState(navigator.onLine);

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  if (enLigne) return null;
  return (
    <div className="hors-ligne machine" role="status">
      <span className="clignote">●</span> PAS DE RÉSEAU · LA LIGNE EST COUPÉE
    </div>
  );
}
