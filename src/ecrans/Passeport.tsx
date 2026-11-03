import { useState } from "react";
import { useTampons, DEFINITIONS, type EtatTampon } from "../lib/tampons";
import { useGlisser, vibrer } from "../lib/effets";
import { Tampon } from "../composants/Tampon";
import { CoupsDeTampon } from "../composants/CoupDeTampon";

// Le passeport de l'agence (maquette D) : les tampons gagnés sont posés en
// vrac comme des visas, six par page ; les places libres disent comment les
// gagner. On tourne les pages du doigt.
const PAR_PAGE = 6;
// Emplacements sur une page de 358 × 520 (en dixièmes d'em) : x, y, rotation.
const PLACES: [number, number, number][] = [
  [1.2, 4.4, -10], [19.4, 5.6, 7], [2.2, 20.4, 5], [19.2, 21.4, -7], [1.4, 36, -3], [19.6, 36.8, 9],
];

export function Passeport({ pseudo }: { pseudo: string }) {
  const { tampons, nouveaux, marquerVus } = useTampons();
  const [page, setPage] = useState(0);
  // Les tampons gagnés d'abord, dans l'ordre où ils sont tombés ; les
  // places libres ensuite.
  const liste = (tampons ?? [])
    .filter((t) => DEFINITIONS[t.cle])
    .sort((a, b) => (a.obtenu_at && b.obtenu_at ? a.obtenu_at.localeCompare(b.obtenu_at) : a.obtenu_at ? -1 : b.obtenu_at ? 1 : 0));
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const gagnes = liste.filter((t) => t.obtenu_at).length;

  function tourner(n: number) {
    if (n < 0 || n >= pages) return;
    setPage(n);
    vibrer(8);
  }
  const glisser = useGlisser(() => tourner(page + 1), () => tourner(page - 1));

  return (
    <main className="ecran">
      <a href="#/compte" className="lien-retour">← COMPTE</a>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <h1 className="titre" style={{ fontSize: 52 }}>LE PASSEPORT<br />DE L'AGENCE</h1>
        <span className="titre" style={{ fontSize: 34, color: "var(--rouge-texte)", flexShrink: 0 }}>
          {tampons ? gagnes : "–"}<span style={{ color: "var(--gris)", fontSize: 22 }}>/{liste.length || 12}</span>
        </span>
      </div>

      <div className="passeport" {...glisser}>
        {tampons === null ? (
          <span className="reflet" style={{ position: "absolute", inset: 0 }} />
        ) : (
          <div key={page} className="passeport-page vue-entree">
            <span className="passeport-entete">VISAS · AGENCE {pseudo.toUpperCase()} · PAGE {page + 1}/{pages}</span>
            {liste.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE).map((t, i) => (
              <Place key={t.cle} tampon={t} place={PLACES[i]} pseudo={pseudo} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
        <button className="bouton discret" onClick={() => tourner(page - 1)} disabled={page === 0} aria-label="Page précédente">←</button>
        <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>PAGE {page + 1} SUR {pages}</span>
        <button className="bouton discret" onClick={() => tourner(page + 1)} disabled={page >= pages - 1} aria-label="Page suivante">→</button>
      </div>

      <CoupsDeTampon nouveaux={nouveaux} total={liste.length} gagnes={gagnes} pseudo={pseudo} onVus={marquerVus} />
    </main>
  );
}

function Place({ tampon, place, pseudo }: { tampon: EtatTampon; place: [number, number, number]; pseudo: string }) {
  const [x, y, r] = place;
  const d = DEFINITIONS[tampon.cle];
  return (
    <span className="passeport-place" style={{ left: `${x}em`, top: `${y}em` }}>
      {tampon.obtenu_at ? (
        <span style={{ transform: `rotate(${r}deg)` }}>
          <Tampon etat={tampon} pseudo={pseudo} />
        </span>
      ) : (
        <span className="visa-libre">
          <span className="machine" style={{ fontSize: "0.85em", letterSpacing: "0.1em" }}>EMPLACEMENT LIBRE</span>
          <span>{d.regle}</span>
          {tampon.sur != null && <span className="machine">{Math.min(tampon.progres ?? 0, tampon.sur)}/{tampon.sur}</span>}
        </span>
      )}
    </span>
  );
}
