import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { PorteAgence } from "../composants/PorteAgence";

const FORME = /^[A-Za-z0-9_À-ÖØ-öø-ÿ-]{3,16}$/;

// Première connexion : le nom écrit sur la porte de l'agence.
export function Pseudo({ onChoisi }: { onChoisi: (pseudo: string) => void }) {
  const [pseudo, setPseudo] = useState("");
  const [verif, setVerif] = useState<{ pour: string; libre: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const propre = pseudo.trim();
  const bienForme = FORME.test(propre);
  const libre = verif?.pour === propre ? verif.libre : null;

  // Vérifié pendant la frappe, une fois la frappe posée.
  useEffect(() => {
    if (!bienForme) return;
    const id = window.setTimeout(() => {
      api.pseudoLibre(propre).then((l) => setVerif({ pour: propre, libre: l })).catch(() => {});
    }, 300);
    return () => window.clearTimeout(id);
  }, [propre, bienForme]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await api.choisirPseudo(propre);
      onChoisi(propre);
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  }

  let etat = "";
  if (propre && !bienForme) etat = propre.length < 3 ? "" : "lettres, chiffres, - et _";
  else if (libre === true) etat = "✓ libre";
  else if (libre === false) etat = "déjà pris";

  return (
    <main className="ecran">
      <span className="etiquette">Nouvelle agence</span>
      <h1 className="titre" style={{ fontSize: 56 }}>LE NOM SUR<br />TA PORTE</h1>
      <form onSubmit={valider} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <div className="champ-etat">
          <input
            id="pseudo"
            aria-label="Nom de ton agence"
            autoComplete="nickname"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={16}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.replace(/\s/g, ""))}
            autoFocus
          />
          {etat && <span className={libre === true ? "vert" : "rouge-texte"}>{etat}</span>}
        </div>
        <span className="petit">3 à 16 lettres ou chiffres. Unique, visible par tous. Tes associés te trouvent avec. Il ne change plus ensuite.</span>
        <PorteAgence pseudo={propre || "—"} sousTitre="Filatures · disparitions · affaires délicates" />
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="gros-bouton papier-fond" disabled={envoi || !bienForme || libre !== true} style={{ marginTop: "auto" }}>
          {envoi ? "…" : "VISSER MA PLAQUE"}
        </button>
        <button type="button" className="lien-retour" style={{ fontSize: 12, color: "var(--gris)", alignSelf: "center" }} onClick={() => supabase.auth.signOut()}>
          Pas la bonne adresse ? Se déconnecter
        </button>
      </form>
    </main>
  );
}
