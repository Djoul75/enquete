import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAccueil } from "../lib/accueil";
import { OngletsAccueil } from "../composants/OngletsAccueil";
import { PorteAgence } from "../composants/PorteAgence";
import type { Agence, Associes as Donnees } from "../lib/types";

let dernier: Donnees | null = null;

export function Associes() {
  const { accueil } = useAccueil(60_000);
  const [donnees, setDonnees] = useState<Donnees | null>(dernier);
  const [pseudo, setPseudo] = useState("");
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [aRetirer, setARetirer] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ pour: string; agences: Agence[] } | null>(null);
  const recherche = pseudo.trim();

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

  // Suggestions pendant la frappe, à partir de deux lettres.
  const chercher = useCallback((texte: string) => {
    api.chercherAgences(texte).then((agences) => setSuggestions({ pour: texte, agences })).catch(() => {});
  }, []);

  useEffect(() => {
    if (recherche.length < 2) return;
    const id = window.setTimeout(() => chercher(recherche), 180);
    return () => window.clearTimeout(id);
  }, [recherche, chercher]);

  const proposees = recherche.length >= 2 && suggestions?.pour === recherche ? suggestions.agences : null;

  async function agir(action: () => Promise<unknown>, succes?: string) {
    setOccupe(true);
    setMessage(null);
    try {
      await action();
      if (succes) setMessage({ texte: succes });
      charger();
      if (recherche.length >= 2) chercher(recherche);
    } catch (e) {
      setMessage({ texte: (e as Error).message, erreur: true });
    }
    setOccupe(false);
  }

  async function ajouter(e: React.FormEvent | null, nom = recherche) {
    e?.preventDefault();
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
            type="search"
            enterKeyHint="send"
            placeholder="Le nom de son agence"
            autoCapitalize="words"
            autoComplete="off"
            spellCheck={false}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.replace(/\s/g, ""))}
          />
          <button className="bouton plein" disabled={occupe || !pseudo.trim()} style={{ flexShrink: 0 }}>Ajouter</button>
        </div>
        {proposees && (
          <div className="suggestions" role="listbox" aria-label="Agences trouvées">
            {proposees.length === 0 && <span className="petit" style={{ padding: "10px 12px" }}>Aucune agence à ce nom pour l'instant.</span>}
            {proposees.map((a) => (
              <div key={a.pseudo} className="suggestion" role="option" aria-selected={false}>
                <span className="qui">
                  <span className="initiale">{a.pseudo[0].toUpperCase()}</span>
                  <span className="titre nom"><Surligne texte={a.pseudo} motif={recherche} /></span>
                </span>
                {a.lien === "associe" ? (
                  <span className="machine vert" style={{ fontSize: 11 }}>ASSOCIÉ ✓</span>
                ) : a.lien === "envoyee" ? (
                  <span className="machine" style={{ fontSize: 11, color: "var(--gris)" }}>DEMANDÉ</span>
                ) : a.lien === "recue" ? (
                  <button type="button" className="bouton plein" disabled={occupe} onClick={() => agir(() => api.repondreAssocie(a.pseudo, true), `${a.pseudo} est ton associé.`)}>Accepter</button>
                ) : (
                  <button type="button" className="bouton" disabled={occupe} onClick={() => ajouter(null, a.pseudo)}>Ajouter</button>
                )}
              </div>
            ))}
          </div>
        )}
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

// Met en valeur la partie du nom qui correspond à ce qui est tapé.
function Surligne({ texte, motif }: { texte: string; motif: string }) {
  const i = texte.toLowerCase().indexOf(motif.toLowerCase());
  if (i < 0) return <>{texte.toUpperCase()}</>;
  return (
    <>
      {texte.slice(0, i).toUpperCase()}
      <span className="rouge">{texte.slice(i, i + motif.length).toUpperCase()}</span>
      {texte.slice(i + motif.length).toUpperCase()}
    </>
  );
}

function bilan(a: Donnees["amis"][number]): string {
  if (a.ensemble === 0) return "Jamais sur la même affaire";
  const base = `${a.ensemble} affaire${a.ensemble > 1 ? "s" : ""} ensemble`;
  if (a.moi_devant === a.lui_devant) return `${base} · égalité`;
  return `${base} · toi ${a.moi_devant}, en face ${a.lui_devant}`;
}
