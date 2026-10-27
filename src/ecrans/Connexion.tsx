import { useState } from "react";
import { supabase } from "../lib/supabase";

export function Connexion() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function entrer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) setErreur("Mauvais identifiants. Ce sont ceux de la plateforme.");
    setEnvoi(false);
  }

  return (
    <main className="ecran pluie" style={{ justifyContent: "center" }}>
      <span className="etiquette">Brigade criminelle</span>
      <h1 className="titre" style={{ fontSize: 96 }}>
        ENQUÊ<span className="rouge">T</span>E
      </h1>
      <form onSubmit={entrer} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <label className="etiquette" htmlFor="email">Matricule</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="etiquette" htmlFor="mdp">Mot de passe</label>
        <input
          id="mdp"
          type="password"
          autoComplete="current-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="gros-bouton papier-fond" disabled={envoi} style={{ marginTop: 8 }}>
          {envoi ? "…" : "PRENDRE SON SERVICE"}
        </button>
      </form>
    </main>
  );
}
