export function NavPartie({ partie, actif }: { partie: number; actif: "scene" | "mur" | "accuser" }) {
  return (
    <nav className="nav-partie" aria-label="Enquête">
      <a href="#/" >DOSSIERS</a>
      <a href={`#/p/${partie}`} className={actif === "scene" ? "actif" : undefined}>SCÈNE</a>
      <a href={`#/p/${partie}/mur`} className={actif === "mur" ? "actif" : undefined}>MUR</a>
      <a href={`#/p/${partie}/accuser`} className="accuser">ACCUSER</a>
    </nav>
  );
}

export function BandeauDuel({ nom, temps, partie }: { nom: string; temps: string; partie: number }) {
  return (
    <a
      href={`#/p/${partie}/telegramme`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        background: "var(--rouge)",
        color: "var(--encre)",
        padding: "8px 10px",
        textDecoration: "none",
        fontWeight: 700,
      }}
    >
      <span className="clignote" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--encre)", flexShrink: 0 }} />
      {nom} a accusé. Il te reste {temps}.
    </a>
  );
}
