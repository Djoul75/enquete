import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAccueil } from "../lib/accueil";
import { usePseudoLibre } from "../lib/pseudo";
import { activerNotifications, etatNotifications } from "../lib/push";
import { appareil, installee } from "../lib/installation";
import { OngletsAccueil } from "../composants/OngletsAccueil";
import { PorteAgence } from "../composants/PorteAgence";
import { CoupsDeTampon } from "../composants/CoupDeTampon";
import { useTampons } from "../lib/tampons";

// Le compte : le nom sur la porte (modifiable), les chiffres de l'agence,
// l'adresse de connexion, et ce qui concerne ce téléphone.
export function Compte({ pseudo, onRenomme }: { pseudo: string; onRenomme: (pseudo: string) => void }) {
  const { accueil } = useAccueil(60_000);
  const { tampons, nouveaux, marquerVus } = useTampons();
  const [email, setEmail] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [nouveau, setNouveau] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [notifs, setNotifs] = useState(etatNotifications());
  const [quitter, setQuitter] = useState(false);
  const propre = nouveau.trim();
  const inchange = propre.toLowerCase() === pseudo.toLowerCase();
  const { etat, libre, valide } = usePseudoLibre(inchange ? "" : propre);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);

  async function renommer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      await api.renommer(propre);
      onRenomme(propre);
      setEdition(false);
      setMessage({ texte: "Nouvelle plaque vissée. Tes associés voient déjà ton nouveau nom." });
    } catch (err) {
      setMessage({ texte: (err as Error).message, erreur: true });
    }
    setEnvoi(false);
  }

  const moi = accueil?.moi;
  const telephone = appareil() !== "ordi";

  return (
    <main className="ecran">
      <span className="etiquette">Mon compte</span>

      <PorteAgence pseudo={edition ? propre || "—" : pseudo} sousTitre="Filatures · disparitions · affaires délicates" />

      {edition ? (
        <form onSubmit={renommer} className="apparait" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="etiquette" htmlFor="nouveau-nom">Nouveau nom sur la porte</label>
          <div className="champ-etat">
            <input
              id="nouveau-nom"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              maxLength={16}
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value.replace(/\s/g, ""))}
              autoFocus
            />
            {etat && !inchange && <span className={libre === true ? "vert" : "rouge-texte"}>{etat}</span>}
          </div>
          <span className="petit">Tes associés et tes parties te suivent. Ton ancien nom redevient libre pour les autres.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bouton plein" style={{ flex: 1 }} disabled={envoi || inchange || !valide}>{envoi ? "…" : "Visser la nouvelle plaque"}</button>
            <button type="button" className="bouton discret" onClick={() => { setEdition(false); setMessage(null); }}>Annuler</button>
          </div>
        </form>
      ) : (
        <button className="bouton" onClick={() => { setNouveau(pseudo); setEdition(true); setMessage(null); }}>
          Changer le nom de mon agence
        </button>
      )}
      {message && <p className={message.erreur ? "erreur" : "petit"} style={message.erreur ? undefined : { margin: 0, color: "var(--gris-clair)" }}>{message.texte}</p>}

      {moi && (
        <section className="chiffres-agence">
          <span><b className="titre">{moi.resolues}</b><span className="etiquette">Résolue{moi.resolues > 1 ? "s" : ""}</span></span>
          <span><b className="titre">{moi.classees}</b><span className="etiquette">Classée{moi.classees > 1 ? "s" : ""}</span></span>
          <span><b className="titre rouge">{moi.record ?? "—"}</b><span className="etiquette">Record</span></span>
        </section>
      )}

      <a href="#/tampons" className="reglage lien" style={{ borderTop: "1px solid var(--trait)" }}>
        <span>
          <span className="reglage-titre">Le passeport de l'agence</span>
          <span className="petit">{tampons ? `${tampons.filter((t) => t.obtenu_at).length} tampon${tampons.filter((t) => t.obtenu_at).length > 1 ? "s" : ""} sur ${tampons.length}` : "Tes tampons de détective"}</span>
        </span>
        <span className="fleche">→</span>
      </a>

      <section className="reglages">
        <span className="etiquette">Connexion</span>
        <div className="reglage">
          <span>
            <span className="reglage-titre">Adresse</span>
            <span className="petit">{email ?? "…"}</span>
          </span>
          <span className="petit" style={{ color: "var(--gris)" }}>Ton code arrive ici</span>
        </div>
      </section>

      <section className="reglages">
        <span className="etiquette">{telephone ? "Sur ce téléphone" : "Sur cet appareil"}</span>
        <div className="reglage">
          <span>
            <span className="reglage-titre">Notifications</span>
            <span className="petit">Rendez-vous, accusations, révélations</span>
          </span>
          {notifs === "active" ? (
            <span className="machine vert" style={{ fontSize: 12 }}>ACTIVÉES ✓</span>
          ) : notifs === "indisponible" ? (
            <span className="petit" style={{ textAlign: "right", maxWidth: 130 }}>Installe d'abord le jeu</span>
          ) : (
            <button className="bouton plein" onClick={async () => setNotifs(await activerNotifications())}>Activer</button>
          )}
        </div>
        {telephone && (
          <a href="#/installer" className="reglage lien">
            <span>
              <span className="reglage-titre">Écran d'accueil</span>
              <span className="petit">{installee() ? "Le jeu est installé ✓" : "Installer le jeu comme une app"}</span>
            </span>
            <span className="fleche">→</span>
          </a>
        )}
      </section>

      <section className="reglages">
        <span className="etiquette">Aide</span>
        <a href="#/tuto" className="reglage lien">
          <span>
            <span className="reglage-titre">Comment jouer</span>
            <span className="petit">Le tuto en sept pages</span>
          </span>
          <span className="fleche">→</span>
        </a>
        <a href="#/regles" className="reglage lien">
          <span>
            <span className="reglage-titre">Toutes les règles</span>
            <span className="petit">Points, pistes, parties à plusieurs</span>
          </span>
          <span className="fleche">→</span>
        </a>
      </section>

      {quitter ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bouton r" style={{ flex: 1 }} onClick={() => supabase.auth.signOut()}>Me déconnecter</button>
          <button className="bouton discret" onClick={() => setQuitter(false)}>Rester</button>
        </div>
      ) : (
        <button className="bouton discret" onClick={() => setQuitter(true)}>Se déconnecter</button>
      )}

      {tampons && <CoupsDeTampon nouveaux={nouveaux} total={tampons.length} gagnes={tampons.filter((t) => t.obtenu_at).length} pseudo={pseudo} onVus={marquerVus} />}
      <OngletsAccueil actif="compte" demandes={accueil?.demandes_associes} />
    </main>
  );
}
