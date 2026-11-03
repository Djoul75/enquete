const ONGLETS = [
  { cle: "dossiers", nom: "DOSSIERS", href: "#/" },
  { cle: "associes", nom: "ASSOCIÉS", href: "#/associes" },
  { cle: "archives", nom: "ARCHIVES", href: "#/archives" },
] as const;

export function OngletsAccueil({ actif, demandes = 0 }: { actif: (typeof ONGLETS)[number]["cle"]; demandes?: number }) {
  return (
    <nav className="onglets onglets-accueil" aria-label="Agence">
      {ONGLETS.map((o) => (
        <a key={o.cle} href={o.href} className={`machine${o.cle === actif ? " actif" : ""}`} aria-current={o.cle === actif ? "page" : undefined}>
          <span style={{ position: "relative" }}>
            {o.nom}
            {o.cle === "associes" && demandes > 0 && <span className="pastille-compte" aria-label={`${demandes} demandes`}>{demandes}</span>}
          </span>
        </a>
      ))}
    </nav>
  );
}
