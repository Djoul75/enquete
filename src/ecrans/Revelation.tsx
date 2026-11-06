import { useEffect, useMemo, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { finDeNuit, heureNuit, indicesTrouves, VERDICTS } from "../lib/partie";
import { api } from "../lib/api";
import { aller } from "../lib/routeur";
import { mouvementReduit } from "../lib/effets";
import { PartageUne } from "../composants/PartageUne";
import { CoupsDeTampon } from "../composants/CoupDeTampon";
import { useTampons } from "../lib/tampons";
import type { DonneesCarte } from "../lib/carte";

export function Revelation({ etat }: { etat: EtatPartie }) {
  const pub = etat.affaire.public;
  const r = etat.revelation!;
  const sol = r.solution;
  const mesIndices = new Set(indicesTrouves(etat).map((i) => i.id));
  const nom = (id: string | null) => pub.suspects.find((s) => s.id === id)?.nom ?? "—";
  const mots = sol.une.toUpperCase().split(" ");
  const dernier = mots.pop();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [partage, setPartage] = useState(false);
  const [nuitOuverte, setNuitOuverte] = useState(false);
  const { tampons, nouveaux, marquerVus } = useTampons();
  const moi = r.joueurs.find((j) => j.moi);
  const carte = useMemo<DonneesCarte | null>(() => {
    if (!moi) return null;
    return {
      partie: etat.partie.id,
      titre: etat.affaire.titre,
      ville: pub.cadre?.ville,
      annee: pub.cadre?.annee,
      pseudo: moi.nom,
      verdict: moi.verdict,
      heure: moi.minutes !== null ? heureNuit(pub.horloge, moi.minutes) : null,
      aube: heureNuit(pub.horloge, etat.nuit.aube),
      fin: finDeNuit(pub.horloge).court.toLowerCase(),
      avance: moi.minutes !== null ? etat.nuit.aube - moi.minutes : 0,
      rang: 1 + r.joueurs.indexOf(moi),
      joueurs: r.joueurs.length,
      coupable: moi.suspect ? moi.suspect === sol.coupable : null,
      mobile: moi.mobile === sol.mobile,
      occasion: !!moi.occasion && sol.occasion.includes(moi.occasion),
      preuve: !!moi.preuve && sol.preuves.includes(moi.preuve),
      braques: moi.braques,
    };
  }, [moi, etat, pub, r, sol]);
  // Le journal arrive en tournoyant, comme dans les vieux films, la première fois.
  const cle = `enquete-revele-${etat.partie.id}`;
  const [tourne] = useState(() => !localStorage.getItem(cle) && !mouvementReduit());
  useEffect(() => localStorage.setItem(cle, "1"), [cle]);

  // Colonnes du tableau des pièces : moi d'abord, puis les autres.
  const colonnes = r.joueurs
    .slice()
    .sort((a, b) => Number(b.moi) - Number(a.moi))
    .map((j) => ({ nom: j.moi ? "TOI" : j.nom.toUpperCase(), trouves: j.moi ? mesIndices : new Set(j.indices) }));
  // À six, les colonnes se serrent pour laisser de la place à l'indice.
  const largeur = colonnes.length > 3 ? 40 : 64;
  const pieces = [
    ...sol.occasion.map((id) => ({ id, role: "OCCASION" })),
    ...sol.preuves.map((id) => ({ id, role: "PREUVE" })),
  ];

  async function revanche() {
    setOccupe(true);
    try {
      if (etat.partie.mode === "groupe") aller(`/bureau/${await api.revanche(etat.partie.id)}`);
      else aller(`/p/${await api.nouvellePartieSolo()}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  return (
    <main className="ecran journal" style={{ background: "var(--papier)", color: "var(--encre)", maxWidth: "none" }}>
      <div className={tourne ? "journal-tourne" : undefined} style={{ maxWidth: 448, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <a href="#/" className="lien-retour">← DOSSIERS</a>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: "3px double var(--encre)", paddingBottom: 8 }}>
          <span className="titre" style={{ fontSize: 40, letterSpacing: 2, lineHeight: 1 }}>{pub.journal.nom.toUpperCase()}</span>
          <span className="machine" style={{ fontSize: 11 }}>
            ÉDITION SPÉCIALE · {pub.journal.date.toUpperCase()} · {pub.journal.prix.toUpperCase()}
          </span>
        </div>

        <h1 className="titre" style={{ fontSize: 58, lineHeight: 0.86, textAlign: "center" }}>
          {mots.join(" ")} <span className="rouge-sombre">{dernier}</span>
        </h1>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{sol.recit}</p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(2, r.joueurs.length)}, minmax(0, 1fr))`, gap: 10 }}>
          {r.joueurs.map((j, i) => {
            const juste = j.suspect === sol.coupable;
            const premier = i === 0 && r.joueurs.length > 1 && !!j.verdict;
            const v = j.verdict ? VERDICTS[j.verdict] : null;
            return (
              <div key={j.nom} className={`carte-verdict${premier ? " premier" : ""}`} style={{ animationDelay: `${(tourne ? 1300 : 0) + i * 150}ms` }}>
                <span className="machine" style={{ fontSize: 12, opacity: 0.75 }}>
                  {r.joueurs.length > 1 ? `${i + 1}${i === 0 ? "ER" : "E"} · ` : ""}
                  {j.moi ? "TOI" : j.nom.toUpperCase()}
                </span>
                <span className="titre" style={{ fontSize: 22, lineHeight: 1, textDecoration: juste || !j.suspect ? undefined : "line-through" }}>
                  {j.suspect ? nom(j.suspect).toUpperCase() : "PAS DE DOSSIER"}
                </span>
                <span
                  className={`tampon-verdict ${j.verdict ?? "aucun"}`}
                  style={{ animationDelay: `${(tourne ? 1600 : 300) + i * 150}ms` }}
                >
                  {v ? v.lignes.map((l) => <span key={l}>{l}</span>) : <span>DÉLAI DÉPASSÉ</span>}
                </span>
                <span className="machine" style={{ fontSize: 11, lineHeight: 1.35 }}>
                  {j.minutes !== null ? `SIGNÉ À ${heureNuit(pub.horloge, j.minutes).toUpperCase()}` : "PAS SIGNÉ"}
                  {j.braques > 0 ? ` · ${j.braques} BRAQUÉ${j.braques > 1 ? "S" : ""}` : ""}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--encre)", paddingTop: 10 }}>
          <div className="ligne-preuve" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${colonnes.length}, ${largeur}px)`, paddingTop: 0 }}>
            <span className="machine" style={{ fontSize: 12 }}>LES PIÈCES QUI COMPTAIENT</span>
            {colonnes.map((c) => (
              <span key={c.nom} className="machine" style={{ fontSize: 10, textAlign: "center", overflowWrap: "anywhere" }}>{c.nom}</span>
            ))}
          </div>
          {pieces.map(({ id, role }) => (
            <div key={id} className="ligne-preuve" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${colonnes.length}, ${largeur}px)` }}>
              <span>
                <span className="machine" style={{ fontSize: 10, color: role === "PREUVE" ? "var(--rouge-sombre)" : "#55524c" }}>{role} · </span>
                {r.indices[id]?.texte}
              </span>
              {colonnes.map((c) => (
                <span key={c.nom} style={{ textAlign: "center", fontWeight: 700, color: c.trouves.has(id) ? undefined : "var(--rouge-sombre)" }}>
                  {c.trouves.has(id) ? "✓" : "✗"}
                </span>
              ))}
            </div>
          ))}
          <div className="detail-trahi">
            <b>Le détail qui trahissait :</b> {sol.rate}
          </div>
        </div>

        <div className="ta-nuit">
          <button className="ta-nuit-tete" onClick={() => setNuitOuverte(!nuitOuverte)} aria-expanded={nuitOuverte}>
            <span className="titre" style={{ fontSize: 24 }}>TA NUIT, MINUTE PAR MINUTE</span>
            <span className="machine" style={{ fontSize: 12 }}>{nuitOuverte ? "▴" : "▾"}</span>
          </button>
          <div className="volet-corps" data-ouvert={nuitOuverte}>
            <div>
              <ol className="chrono-nuit">
                {etat.journal.map((e) => (
                  <li key={`${e.type}:${e.ref}`}>
                    <span className="machine">{heureNuit(pub.horloge, e.minute)}</span>
                    <span>
                      {e.type === "fouille"
                        ? `Fouille : ${pub.lieux.find((l) => l.id === e.ref)?.nom.toLowerCase()}${e.indice ? "" : ", rien"}`
                        : e.type === "montrer"
                          ? `Montré à ${nom(e.suspect ?? null)} : ${e.piece?.texte}`
                          : `${nom(e.suspect ?? null)} : « ${e.question} »`}
                      {e.braque && <b> Braqué.</b>}
                      {e.craque && <b> A craqué.</b>}
                    </span>
                  </li>
                ))}
                {moi?.minutes != null && (
                  <li>
                    <span className="machine">{heureNuit(pub.horloge, moi.minutes)}</span>
                    <b>Dossier signé.</b>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>

        {erreur && <p className="erreur">{erreur}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {carte && (
            <button className="gros-bouton rouge-fond" onClick={() => setPartage(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              PARTAGER MA UNE
              <span style={{ fontFamily: "var(--texte)", fontSize: 12, letterSpacing: 0 }}>ton verdict en image, sans dévoiler le coupable</span>
            </button>
          )}
          <a href={`#/p/${etat.partie.id}/carnet`} className="gros-bouton contour" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            REVOIR L'ENQUÊTE
            <span style={{ fontFamily: "var(--texte)", fontSize: 12, letterSpacing: 0, color: "#55524c" }}>tes notes et réponses, avec la solution en tête</span>
          </a>
          <button className="gros-bouton encre-fond" onClick={revanche} disabled={occupe}>
            {occupe ? "…" : etat.partie.mode === "groupe" ? "REVANCHE AVEC LES MÊMES →" : "AFFAIRE SUIVANTE →"}
          </button>
        </div>
      </div>
      {partage && carte && <PartageUne donnees={carte} onFermer={() => setPartage(false)} />}
      {tampons && moi && (
        // Le tampon tombe une fois le journal posé.
        <CoupsDeTampon nouveaux={nouveaux} total={tampons.length} gagnes={tampons.filter((t) => t.obtenu_at).length} pseudo={moi.nom} onVus={marquerVus} delai={tourne ? 1700 : 600} />
      )}
    </main>
  );
}
