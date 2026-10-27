import type { CSSProperties } from "react";

// Six silhouettes en aplats, façon affiche de film noir. Les dimensions
// sont en % du cadre (3:4) : corps posé en bas, tête au-dessus, et parfois
// un chapeau ou des cheveux.
type Forme = { l: number; h: number; r?: string; b?: number; dx?: number };
type Modele = { corps: Forme; tete: Forme; extras: Forme[] };

const MODELES: Modele[] = [
  // 0 : homme au feutre
  { corps: { l: 52, h: 46, r: "48% 48% 0 0" }, tete: { l: 25, h: 19, b: 43 }, extras: [{ l: 30, h: 8, b: 59, r: "40% 40% 0 0" }, { l: 50, h: 3, b: 58 }] },
  // 1 : femme aux cheveux longs
  { corps: { l: 42, h: 42, r: "50% 50% 0 0" }, tete: { l: 23, h: 17, b: 41 }, extras: [{ l: 34, h: 30, b: 34, r: "50% 50% 30% 30%" }] },
  // 2 : homme trapu
  { corps: { l: 62, h: 40, r: "45% 45% 0 0" }, tete: { l: 28, h: 21, b: 37 }, extras: [] },
  // 3 : femme au chapeau cloche
  { corps: { l: 40, h: 44, r: "50% 50% 0 0" }, tete: { l: 23, h: 17, b: 42 }, extras: [{ l: 32, h: 9, b: 54, r: "50% 50% 10% 10%" }] },
  // 4 : homme maigre, col relevé
  { corps: { l: 38, h: 52, r: "40% 40% 0 0" }, tete: { l: 22, h: 16, b: 50 }, extras: [{ l: 30, h: 8, b: 47, r: "20% 20% 0 0" }] },
  // 5 : homme au béret
  { corps: { l: 50, h: 44, r: "48% 48% 0 0" }, tete: { l: 25, h: 19, b: 41 }, extras: [{ l: 30, h: 5, b: 57, r: "50% 50% 30% 30%", dx: 4 }] },
];

function style(f: Forme, couleur: string): CSSProperties {
  return {
    width: `${f.l}%`,
    height: `${f.h}%`,
    bottom: `${f.b ?? 0}%`,
    borderRadius: f.r ?? "50%",
    background: couleur,
    marginLeft: f.dx ? `${f.dx}%` : undefined,
  };
}

export function Silhouette({
  variante,
  couleur = "var(--papier)",
  fond,
  souligne,
}: {
  variante: number;
  couleur?: string;
  fond?: string;
  souligne?: boolean;
}) {
  const m = MODELES[((variante % MODELES.length) + MODELES.length) % MODELES.length];
  return (
    <span
      className="silhouette"
      aria-hidden="true"
      style={{ background: fond, borderBottom: souligne ? "3px solid var(--rouge)" : undefined }}
    >
      {m.extras.map((e, i) => (
        <span key={i} style={style(e, couleur)} />
      ))}
      <span style={style(m.corps, couleur)} />
      <span style={style(m.tete, couleur)} />
    </span>
  );
}
