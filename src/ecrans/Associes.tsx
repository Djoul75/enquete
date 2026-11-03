import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAccueil } from "../lib/accueil";
import { OngletsAccueil } from "../composants/OngletsAccueil";
import { PorteAgence } from "../composants/PorteAgence";
import type { Associes as Donnees } from "../lib/types";

let dernier: Donnees | null = null;

export function Associes() {
  const { accueil } = useAccueil(60_000);
  const [donnees, setDonnees] = useState<Donnees | null>(dernier);
  const [pseudo, setPseudo] = useState("");
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [aRetirer, setARetirer] = useState<string | null>(null);

  const charger = useCallback(() => {
    api.associes().then((d) => {
      dernier = d;
      setDonnees(d);
    }).catch((e: Error) => setMessage({ texte: e.message, erreur: true }));
  }, []);

  useEffect(() => {
    charger();
    const id = window.setInterval(charger, 30_000);
    return () => window.clearInterval(id);
  }, [charger]);

  async function agir(action: () => Promise<unknown>, succes?: string) {
    setOccupe(true);
    setMessage(null);
    try {
      await action();
      if (succes) setMessage({ texte: succes });
      charger();
    } catch (e) {
      setMessage({ texte: (e as Error).message, erreur: true });
    }
    setOccupe(false);
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const nom = pseudo.trim();
    if (!nom) return;
    setOccupe(true);
    setMessage(null);
    try {
      const r = await api.ajouterAssocie(nom);
      setMessage({
        texte: r === "associes" ? `Vous êtes associés.` : r === "deja" ? "C'est déjà fait, ou ta demande attend sa réponse." : `Demande envoyée. ${nom} doit accepter.`,
      });
      setPseudo("");
      charger();
    } catch (err) {
      setMessage({ texte: (err as Error).message, erreur: true });
    }
    setOccupe(false);
  }

  const moi = accueil?.moi;

  return (
    <main className="ecran">
      {moi && (
        <PorteAgence
          pseudo={moi.pseudo}
          petite
          sousTitre={`${moi.resolues} résolue${moi.resolues > 1 ? "s" : ""} · ${moi.classees} classée${moi.classees > 1 ? "s" : ""}${moi.record != null ? ` · record ${moi.record}` : ""}`}
        />
      )}

      <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label className="etiquette" htmlFor="associe">S'associer avec un privé</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="associe"
            placeholder="Son nom d'agence, exact"
            autoCapitalize="words"
            autoComplete="off"
            spellCheck={false}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.replace(/\s/g, ""))}
          />
          <button className="bouton plein" disabled={occupe || !pseudo.trim()} style={{ flexShrink: 0 }}>Ajouter</button>
        </div>
        {message && <p className={message.erreur ? "erreur" : "petit"} style={message.erreur ? undefined : { margin: 0, color: "var(--gris-clair)" }}>{message.texte}</p>}
      </form>

      {donnees && donnees.recues.length > 0 && (
        <section>
          <span className="etiquette">Demandes reçues · {donnees.recues.length}</span>
          {donnees.recues.map((p) => (
            <div key={p} className="ligne-associe apparait">
              <span className="qui"><span className="initiale">{p[0].toUpperCase()}</span><span className="titre nom">{p.toUpperCase()}</span></span>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="bouton plein" disabled={occupe} onClick={() => agir(() => api.repondreAssocie(p, true), `${p} est ton associé.`)}>Oui</button>
                <button className="bouton discret" disabled={occupe} onClick={() => agir(() => api.repondreAssocie(p, false))}>Non</button>
              </span>
            </div>
          ))}
        </section>
      )}

      <section>
        <span className="etiquette">Mes associés{donnees ? ` · ${donnees.amis.length}` : ""}</span>
        {donnees && donnees.amis.length === 0 && (
          <p className="petit" style={{ margin: "8px 0 0" }}>
            Personne pour l'instant. Demande à tes amis le nom de leur agence, ou donne-leur le tien : <b style={{ color: "var(--papier)" }}>{moi?.pseudo}</b>.
          </p>
        )}
        {donnees?.amis.map((a) => (
          <div key={a.pseudo} className="ligne-associe">
            <span className="qui">
              <span className="initiale">{a.pseudo[0].toUpperCase()}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span className="titre nom">{a.pseudo.toUpperCase()}</span>
                <span className="petit" style={{ color: "var(--gris-clair)" }}>{bilan(a)}</span>
              </span>
            </span>
            {aRetirer === a.pseudo ? (
              <span style={{ display: "flex", gap: 6 }}>
                <button className="bouton r" disabled={occupe} onClick={() => agir(() => api.retirerAssocie(a.pseudo)).then(() => setARetirer(null))}>Rompre</button>
                <button className="bouton discret" onClick={() => setARetirer(null)}>Garder</button>
              </span>
            ) : (
              <button className="lien-retour" style={{ fontSize: 18, color: "var(--gris)", padding: "0 6px" }} aria-label={`Rompre avec ${a.pseudo}`} onClick={() => setARetirer(a.pseudo)}>×</button>
            )}
          </div>
        ))}
      </section>

      {donnees && donnees.envoyees.length > 0 && (
        <section>
          <span className="etiquette">En attente de réponse</span>
          {donnees.envoyees.map((p) => (
            <div key={p} className="ligne-associe" style={{ opacity: 0.6 }}>
              <span className="qui"><span className="initiale attente">{p[0].toUpperCase()}</span><span className="titre nom">{p.toUpperCase()}</span></span>
              <button className="bouton discret" disabled={occupe} onClick={() => agir(() => api.retirerAssocie(p))}>Annuler</button>
            </div>
          ))}
        </section>
      )}

      <OngletsAccueil actif="associes" demandes={donnees?.recues.length ?? accueil?.demandes_associes} />
    </main>
  );
}

function bilan(a: Donnees["amis"][number]): string {
  if (a.ensemble === 0) return "Jamais sur la même affaire";
  const base = `${a.ensemble} affaire${a.ensemble > 1 ? "s" : ""} ensemble`;
  if (a.moi_devant === a.lui_devant) return `${base} · égalité`;
  return `${base} · toi ${a.moi_devant}, en face ${a.lui_devant}`;
}
