import { useAccueil } from "../lib/accueil";
import { OngletsAccueil } from "../composants/OngletsAccueil";
import type { ResumePartie } from "../lib/types";

export function Archives() {
  const { accueil, erreur } = useAccueil(60_000);
  const archives = accueil?.parties.filter((p) => p.revelee) ?? [];

  return (
    <main className="ecran pluie">
      <span className="etiquette">Agence {accueil?.moi.pseudo ?? ""}</span>
      <h1 className="titre" style={{ fontSize: 64 }}>ARCHIVES</h1>
      {accueil?.moi.record != null && (
        <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
          {accueil.moi.resolues} RÉSOLUE{accueil.moi.resolues > 1 ? "S" : ""} · {accueil.moi.classees} CLASSÉE{accueil.moi.classees > 1 ? "S" : ""} · RECORD {accueil.moi.record}
        </span>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      {accueil && archives.length === 0 && <p className="petit" style={{ margin: 0 }}>Aucune affaire close pour l'instant.</p>}
      <section>
        {archives.map((p, i) => {
          const resolue = (p.score ?? 0) >= 50;
          return (
            <a key={p.id} href={`#/p/${p.id}`} className="ligne-archive apparait" style={{ animationDelay: `${Math.min(i, 10) * 40}ms`, borderBottom: i === archives.length - 1 ? "1px solid var(--trait)" : undefined }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="titre" style={{ fontSize: 23, lineHeight: 1 }}>{p.titre.toUpperCase()}</span>
                <span className="petit" style={{ color: "var(--gris-clair)" }}>{sousTitre(p)}</span>
              </span>
              <span className={`tampon${resolue ? "" : " rouge-texte"}`} style={{ transform: `rotate(${i % 2 ? 3 : -4}deg)` }}>
                {resolue ? "RÉSOLUE" : "CLASSÉE"}
              </span>
            </a>
          );
        })}
      </section>
      <OngletsAccueil actif="archives" demandes={accueil?.demandes_associes} />
    </main>
  );
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function sousTitre(p: ResumePartie): string {
  const score = p.score ?? 0;
  if (p.mode === "solo") return `${dateCourte(p.created_at)} · Seul · ${score} pts`;
  const autres = p.autres ?? [];
  if (autres.length === 1) return `${dateCourte(p.created_at)} · toi ${score}, ${autres[0].nom} ${autres[0].score ?? 0}`;
  const rang = 1 + autres.filter((a) => (a.score ?? 0) > score).length;
  return `${dateCourte(p.created_at)} · À ${autres.length + 1} · ${rang === 1 ? "1er" : `${rang}e`} · ${score} pts`;
}
