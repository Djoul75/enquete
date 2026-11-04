// Le nom du jeu, AGENCE NOIRE, avec le O rouge de l'enseigne.
export function Logo({ taille, neon, lignes = 1 }: { taille: number | string; neon?: boolean; lignes?: 1 | 2 }) {
  return (
    <h1 className="titre logo" style={{ fontSize: taille }}>
      AGENCE{lignes === 2 ? <br /> : " "}N<span className={neon ? "rouge neon" : "rouge"}>O</span>IRE
    </h1>
  );
}
