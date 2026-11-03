import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// Pas de mot de passe : un code à 6 chiffres reçu par mail. Il se tape dans
// l'app, donc ça marche aussi depuis l'écran d'accueil de l'iPhone (un lien
// magique s'ouvrirait dans Safari, sans la session de l'app).
export function Connexion() {
  const [email, setEmail] = useState(() => localStorage.getItem("enquete-email") ?? "");
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const champCode = useRef<HTMLInputElement>(null);

  async function envoyer(e?: React.FormEvent) {
    e?.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setEnvoi(false);
    if (error) {
      setErreur(error.status === 429 ? "Trop de codes demandés. Réessaie dans une minute." : "Le télégramme n'est pas parti. Vérifie l'adresse.");
      return;
    }
    localStorage.setItem("enquete-email", email.trim());
    setCode("");
    setEtape("code");
  }

  useEffect(() => {
    if (etape === "code") champCode.current?.focus();
  }, [etape]);

  async function verifier(valeur: string) {
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: valeur, type: "email" });
    setEnvoi(false);
    if (error) {
      setErreur("Ce code ne marche pas, ou il a expiré.");
      setCode("");
    }
  }

  if (etape === "code") {
    return (
      <main className="ecran">
        <button className="lien-retour" style={{ alignSelf: "flex-start" }} onClick={() => setEtape("email")}>← AUTRE ADRESSE</button>
        <div className="carte-papier apparait" style={{ transform: "rotate(-1.2deg)", marginTop: 12 }}>
          <span className="machine" style={{ fontSize: 12 }}>TÉLÉGRAMME · CONFIDENTIEL</span>
          <span className="machine" style={{ fontSize: 14, lineHeight: 1.5 }}>
            CODE ENVOYÉ À {email.trim().toUpperCase()} STOP VALABLE UNE HEURE STOP NE LE DONNEZ À PERSONNE STOP
          </span>
        </div>
        <label className="etiquette" htmlFor="code" style={{ marginTop: 10 }}>Code reçu</label>
        <div className="code-cases">
          <input
            ref={champCode}
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            disabled={envoi}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) verifier(v);
            }}
          />
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={code[i] ? "plein" : i === code.length ? "actif" : undefined} aria-hidden="true">{code[i] ?? ""}</span>
          ))}
        </div>
        {erreur && <p className="erreur">{erreur}</p>}
        <span className="petit">
          Rien reçu ? Regarde dans les indésirables.{" "}
          <button className="lien-retour" style={{ fontSize: 12, textDecoration: "underline", color: "var(--gris-clair)" }} onClick={() => envoyer()} disabled={envoi}>
            Renvoyer
          </button>
        </span>
        <span className="petit" style={{ marginTop: "auto", textAlign: "center" }}>
          {envoi ? "Vérification…" : "Le code se valide tout seul au 6e chiffre."}
        </span>
      </main>
    );
  }

  return (
    <main className="ecran pluie" style={{ justifyContent: "center" }}>
      <span className="etiquette">Agence de détectives privés</span>
      <h1 className="titre" style={{ fontSize: 96 }}>
        ENQUÊ<span className="rouge">T</span>E
      </h1>
      <p style={{ margin: 0, color: "var(--gris-clair)", fontSize: 14 }}>
        Des meurtres, des menteurs, et d'autres privés sur la même affaire que toi.
      </p>
      <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <label className="etiquette" htmlFor="email">Ton adresse mail</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="gros-bouton papier-fond" disabled={envoi} style={{ marginTop: 8 }}>
          {envoi ? "…" : "RECEVOIR MON CODE"}
        </button>
        <span className="petit" style={{ textAlign: "center" }}>Même écran pour s'inscrire et se reconnecter.</span>
      </form>
    </main>
  );
}
