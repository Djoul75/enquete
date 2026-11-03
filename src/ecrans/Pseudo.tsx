import { useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { usePseudoLibre } from "../lib/pseudo";
import { PorteAgence } from "../composants/PorteAgence";

// Première connexion : le nom écrit sur la porte de l'agence.
export function Pseudo({ onChoisi }: { onChoisi: (pseudo: string) => void }) {
  const [pseudo, setPseudo] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const propre = pseudo.trim();
  const { etat, libre, valide } = usePseudoLibre(propre);

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
        <span className="petit">3 à 16 lettres ou chiffres. Unique, visible par tous. Tes associés te trouvent avec. Tu pourras le changer dans ton compte.</span>
        <PorteAgence pseudo={propre || "—"} sousTitre="Filatures · disparitions · affaires délicates" />
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="gros-bouton papier-fond" disabled={envoi || !valide} style={{ marginTop: "auto" }}>
          {envoi ? "…" : "VISSER MA PLAQUE"}
        </button>
        <button type="button" className="lien-retour" style={{ fontSize: 12, color: "var(--gris)", alignSelf: "center" }} onClick={() => supabase.auth.signOut()}>
          Pas la bonne adresse ? Se déconnecter
        </button>
      </form>
    </main>
  );
}
