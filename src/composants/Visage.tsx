import { useId } from "react";
import type { Visage as V } from "../lib/visuels";

// Portrait façon affiche de film noir, assemblé à partir de pièces
// (coiffure, chapeau, tenue…). Tout est dessiné avec l'ombre à droite, puis
// retourné en miroir quand l'ombre est à gauche. Repère : cadre 120 × 150,
// visage centré en (60, 68), haut du crâne à y = 42, menton à y = 94.

const E = "#0b0b0b"; // encre
const P = "#ede8dd"; // papier
const R = "#d7261e"; // rouge
const F = "#1a1916"; // fond
const T = "#2a2925"; // trait
const T2 = "#3a3833";

const CX = 60;
const CY = 68;
const RY = 26;

export function Visage({ v, cadrage = "buste", label, sansFond }: { v: V; cadrage?: "buste" | "tete"; label?: string; sansFond?: boolean }) {
  const id = useId();
  const rx = v.femme ? 19 : v.carrure === "forte" ? 25 : v.carrure === "fine" ? 20 : 22;
  const cheveux = v.age === "vieux" ? "#8a867e" : E;
  const epaules = v.carrure === "forte" ? 62 : v.carrure === "fine" ? 46 : 52;
  const haut_epaules = v.femme ? 120 : 112;
  const cou = v.femme ? 16 : v.carrure === "forte" ? 28 : 20;
  const yeux_dans_l_ombre = v.chapeau === "feutre" || v.chapeau === "casquette";
  const g = CX - rx;
  const d = CX + rx;

  return (
    <svg
      viewBox={cadrage === "tete" ? "30 30 60 60" : "0 0 120 150"}
      style={{ display: "block", width: "100%", height: "auto", background: sansFond ? undefined : F }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {v.accessoire === "voilette" && (
        <defs>
          <pattern id={`${id}v`} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 0 L4 4 M4 0 L0 4" stroke={E} strokeWidth="0.6" />
          </pattern>
        </defs>
      )}
      {!sansFond && (
        <>
          <rect width="120" height="150" fill={F} />
          <path d="M0 22 L120 2 L120 10 L0 32Z M0 48 L120 28 L120 36 L0 58Z M0 74 L120 54 L120 62 L0 84Z" fill={P} opacity="0.06" />
        </>
      )}

      <g transform={v.ombre === "gauche" ? "translate(120 0) scale(-1 1)" : undefined}>
        {/* Cheveux, derrière la tête */}
        {v.coiffure === "longs" && <path d={`M28 150 C18 112 20 62 32 40 C42 20 78 20 88 40 C100 62 102 112 92 150Z`} fill={cheveux} />}
        {v.coiffure === "carre" && <path d={`M${g - 3} 62 C${g - 5} 82 ${g - 1} 94 ${g + 6} 99 L${d - 6} 99 C${d + 1} 94 ${d + 5} 82 ${d + 3} 62Z`} fill={cheveux} />}
        {v.coiffure === "chignon" && <circle cx={CX + 4} cy="36" r="10" fill={cheveux} />}

        {/* Épaules et tenue */}
        <Tenue v={v} w={epaules} s={haut_epaules} cou={cou} />

        {/* Cou */}
        <rect x={CX - cou / 2} y="86" width={cou} height={haut_epaules - 84} fill={P} />
        <path d={`M${CX} 94 L${CX + cou / 2} 92 L${CX + cou / 2} ${haut_epaules + 4} L${CX} ${haut_epaules + 6}Z`} fill={E} />
        {v.tenue === "col-roule" && <rect x={CX - cou / 2 - 3} y={haut_epaules - 12} width={cou + 6} height="14" rx="3" fill={T} />}
        {v.tenue === "uniforme" && <rect x={CX - cou / 2 - 1} y={haut_epaules - 8} width={cou + 2} height="9" fill={P} />}
        {v.accessoire === "perles" &&
          [-11, -5.5, 0, 5.5, 11].map((dx, i) => (
            <circle key={i} cx={CX + dx} cy={haut_epaules - 4 + Math.abs(dx) * -0.25 + 3} r="1.8" fill={i > 2 ? "#b5b0a7" : P} />
          ))}
        {v.accessoire === "noeud" && <path d={`M50 ${haut_epaules + 2} L60 ${haut_epaules + 7} L70 ${haut_epaules + 2} L70 ${haut_epaules + 14} L60 ${haut_epaules + 9} L50 ${haut_epaules + 14}Z`} fill={E} />}
        {v.accessoire === "foulard" && <path d={`M${CX - 12} ${haut_epaules - 2} L${CX + 12} ${haut_epaules - 2} L${CX + 2} ${haut_epaules + 16}Z`} fill={R} />}

        {/* Oreilles */}
        {v.coiffure !== "longs" && v.coiffure !== "carre" && v.chapeau !== "cloche" && (
          <>
            <ellipse cx={g + 1} cy="72" rx="4" ry="7" fill={P} />
            <ellipse cx={d - 1} cy="72" rx="4" ry="7" fill={E} />
          </>
        )}

        {/* Visage et ombre */}
        <ellipse cx={CX} cy={CY} rx={rx} ry={RY} fill={P} />
        <path
          d={`M${CX + 2} ${CY - RY} C${d - 6} ${CY - RY + 2} ${d} ${CY - 12} ${d} ${CY} C${d} ${CY + 16} ${CX + 12} ${CY + RY} ${CX} ${CY + RY} C${CX + 6} ${CY + 18} ${CX + 8} ${CY + 8} ${CX + 7} ${CY} C${CX + 6} ${CY - 10} ${CX + 4} ${CY - 18} ${CX + 2} ${CY - RY}Z`}
          fill={E}
        />

        {/* Traits */}
        {v.femme ? (
          <path d="M45 60 Q50 57 56 59" stroke={E} strokeWidth="1.6" fill="none" />
        ) : (
          <path d="M44 59.5 L56 58" stroke={E} strokeWidth={v.carrure === "forte" ? 3 : 2.4} strokeLinecap="round" />
        )}
        {!yeux_dans_l_ombre &&
          (v.femme ? (
            <path d="M46 66 Q51 62.5 56 66 Q51 68.5 46 66Z" fill={E} />
          ) : (
            <path d="M46 66 L55 66" stroke={E} strokeWidth="2.2" strokeLinecap="round" />
          ))}
        {!yeux_dans_l_ombre && <circle cx="71" cy="66" r="1.2" fill={P} />}
        <path d="M58 70 L56 77 L59 78" stroke={E} strokeWidth="1.2" fill="none" />
        {v.rouge_levres ? (
          <path d="M53 83 Q57 80 60 81.5 Q63 80 67 83 Q60 88 53 83Z" fill={R} />
        ) : v.femme ? (
          <path d="M54 84 Q60 82 66 84" stroke={E} strokeWidth="1.8" fill="none" />
        ) : (
          <path d="M54 85 L64 84.5" stroke={E} strokeWidth="1.6" />
        )}
        {v.age === "vieux" && <path d="M47 50 L55 49 M46 53 L53 52.5 M43 72 L45 76" stroke={E} strokeWidth="0.8" opacity="0.6" />}

        {/* Pilosité */}
        {v.pilosite === "moustache" && <path d="M46 80 C52 74 58 76 60 78 C62 76 68 74 74 80 C68 82 64 82 60 81 C56 82 52 82 46 80Z" fill={cheveux} />}
        {v.pilosite === "barbe" && (
          <path d={`M${g + 1} 72 C${g + 1} 90 50 98 60 98 C70 98 ${d - 1} 90 ${d - 1} 72 C${d - 5} 82 68 80 60 80 C52 80 ${g + 5} 82 ${g + 1} 72Z M50 80 C55 76 65 76 70 80 L66 82 L54 82Z`} fill={cheveux} />
        )}
        {v.pilosite === "favoris" && (
          <>
            <path d={`M${g + 1} 58 L${g + 6} 58 L${g + 7} 80 L${g + 2} 76Z`} fill={cheveux} />
            <path d={`M${d - 1} 58 L${d - 6} 58 L${d - 7} 80 L${d - 2} 76Z`} fill={cheveux} />
          </>
        )}

        {/* Cheveux, devant */}
        {v.coiffure === "longs" && (
          <>
            <path d="M36 66 C34 40 50 32 68 36 C76 38 82 44 84 52 C72 42 54 42 44 54 C40 58 38 62 36 66Z" fill={cheveux} />
            <path d="M80 48 C88 70 84 104 92 128 L100 124 C94 96 98 62 86 42Z" fill={cheveux} />
          </>
        )}
        {(v.coiffure === "carre" || v.coiffure === "chignon" || v.coiffure === "courts") && v.chapeau === "aucun" && (
          <path
            d={`M${g} 64 C${g - 1} 44 ${CX - rx / 2} 38 ${CX} 38 C${CX + rx / 2} 38 ${d + 1} 44 ${d} 64 C${d - 3} 52 ${CX + rx / 2} 47 ${CX - 2} 48 C${CX - rx / 2} 49 ${g + 3} 54 ${g} 64Z`}
            fill={cheveux}
          />
        )}
        {(v.coiffure === "courts" || v.coiffure === "carre") && v.chapeau !== "aucun" && v.chapeau !== "cloche" && (
          <path d={`M${g} 64 L${g + 1} 50 L${g + 6} 50 L${g + 4} 62Z M${d} 64 L${d - 1} 50 L${d - 6} 50 L${d - 4} 62Z`} fill={cheveux} />
        )}
        {v.coiffure === "degarni" && (
          <>
            <path d={`M${g + 1} 62 C${g + 1} 52 ${g + 5} 47 ${g + 9} 46 L${g + 6} 62Z`} fill={cheveux} />
            <path d={`M${d - 1} 62 C${d - 1} 52 ${d - 5} 47 ${d - 9} 46 L${d - 6} 62Z`} fill={cheveux} />
          </>
        )}

        {/* Chapeaux */}
        {v.chapeau === "feutre" && (
          <>
            <path d="M38 46 L82 46 L80 62 C70 58 50 58 40 62Z" fill={E} />
            <path d="M47 56 L55 56" stroke={P} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M65 56 L71 56" stroke={P} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <path d="M36 44 C35 22 44 14 60 16 C76 14 85 22 84 44Z" fill={E} />
            <path d="M50 22 Q60 28 70 22" stroke={T} strokeWidth="2" fill="none" />
            <rect x="36" y="36" width="48" height="5" fill={T} />
            <ellipse cx="60" cy="45" rx="42" ry="7" fill={E} />
            <path d="M20 47 Q60 56 100 47" stroke={T2} strokeWidth="1.2" fill="none" />
          </>
        )}
        {v.chapeau === "cloche" && (
          <>
            <path d="M36 60 C33 34 46 26 60 26 C74 26 87 34 84 60 C76 54 44 54 36 60Z" fill={E} />
            <path d="M38 54 C50 50 70 50 82 54" stroke={T} strokeWidth="3" fill="none" />
          </>
        )}
        {v.chapeau === "beret" && (
          <>
            <ellipse cx="64" cy="42" rx="25" ry="8" fill={E} transform="rotate(-6 64 42)" />
            <rect x="63" y="31" width="2" height="4" fill={E} />
          </>
        )}
        {v.chapeau === "casquette" && (
          <>
            <path d="M38 46 C37 28 83 28 82 46Z" fill={E} />
            <path d="M34 46 L86 46 L80 52 L40 52Z" fill={T} />
            <path d="M41 52 L80 52 L79 60 C70 57 50 57 42 60Z" fill={E} />
            <path d="M47 57 L55 57" stroke={P} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M65 57 L71 57" stroke={P} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <rect x="38" y="42" width="44" height="3" fill={T2} />
          </>
        )}
        {v.chapeau === "melon" && (
          <>
            <path d="M40 46 C39 22 81 22 80 46Z" fill={E} />
            <ellipse cx="60" cy="46" rx="29" ry="4.5" fill={E} />
            <path d="M41 42 L79 42" stroke={T} strokeWidth="3" />
          </>
        )}

        {/* Accessoires du visage */}
        {v.accessoire === "cigarette" && (
          <>
            <path d="M60 85 L84 90" stroke={P} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="85" cy="90" r="1.8" fill={R} />
            <path d="M87 86 C93 77 83 69 91 58 C97 48 89 40 95 31" stroke={P} strokeWidth="1.2" fill="none" opacity="0.35" />
          </>
        )}
        {v.accessoire === "lunettes" && (
          <>
            <circle cx="50.5" cy="66" r="6" fill="none" stroke={E} strokeWidth="1.3" />
            <circle cx="69.5" cy="66" r="6" fill="none" stroke="#b5b0a7" strokeWidth="1.3" />
            <path d="M56.5 65 L63.5 65" stroke={E} strokeWidth="1.3" />
          </>
        )}
        {v.accessoire === "monocle" && (
          <>
            <circle cx="50.5" cy="66" r="6" fill="none" stroke={E} strokeWidth="1.3" />
            <path d="M46 70 C42 84 46 100 40 112" stroke="#8a867e" strokeWidth="0.8" fill="none" />
          </>
        )}
        {v.accessoire === "voilette" && <path d="M37 58 C45 54 75 54 83 58 L81 78 C70 82 50 82 39 78Z" fill={`url(#${id}v)`} />}
      </g>
    </svg>
  );
}

function Tenue({ v, w, s, cou }: { v: V; w: number; s: number; cou: number }) {
  const epaules = `M${CX - w} 150 C${CX - w + 6} ${s + 10} ${CX - w / 2} ${s} ${CX} ${s} C${CX + w / 2} ${s} ${CX + w - 6} ${s + 10} ${CX + w} 150Z`;
  switch (v.tenue) {
    case "robe":
      return (
        <>
          <path d={epaules} fill={P} />
          <path d={`M30 150 C36 ${s + 18} 46 ${s + 14} 60 ${s + 20} C74 ${s + 14} 84 ${s + 18} 90 150Z`} fill={E} />
        </>
      );
    case "gilet":
      return (
        <>
          <path d={epaules} fill={E} />
          <path d={`M${CX - 14} ${s} L${CX} 150 L${CX + 14} ${s}Z`} fill={P} />
          <path d={`M${CX + 28} ${s + 4} L${CX + 44} ${s + 10} L${CX + 40} 150 L${CX + 26} 150Z`} fill={P} />
          <path d={`M${CX + 31} ${s + 20} L${CX + 41} ${s + 22} M${CX + 30} ${s + 26} L${CX + 40} ${s + 28}`} stroke="#8a867e" strokeWidth="1.5" />
        </>
      );
    case "imper":
      return (
        <>
          <path d={epaules} fill={E} />
          <path d={`M${CX - 8} ${s - 4} L${CX} ${s + 20} L${CX + 8} ${s - 4}Z`} fill={P} />
          <path d={`M${CX - 2} ${s} L${CX + 2} ${s} L${CX + 3} ${s + 20} L${CX} ${s + 24} L${CX - 3} ${s + 20}Z`} fill={E} />
          <path d={`M${CX - 28} ${s + 2} L${CX - cou / 2 - 4} ${s - 18} L${CX - 4} ${s + 20}Z`} fill={T} />
          <path d={`M${CX + 28} ${s + 2} L${CX + cou / 2 + 4} ${s - 18} L${CX + 4} ${s + 20}Z`} fill={T} />
        </>
      );
    case "uniforme":
      return (
        <>
          <path d={epaules} fill={E} />
          <path d={`M${CX} ${s} L${CX} 150`} stroke={T2} strokeWidth="1" />
          <circle cx={CX + 4} cy={s + 14} r="1.6" fill={P} />
          <circle cx={CX + 4} cy={s + 26} r="1.6" fill={P} />
          <path d={`M${CX - w + 12} ${s + 8} L${CX - w / 2} ${s + 2}`} stroke={T2} strokeWidth="3" />
        </>
      );
    case "col-roule":
      return <path d={epaules} fill={E} />;
    default:
      return (
        <>
          <path d={epaules} fill={E} />
          <path d={`M${CX - 9} ${s} L${CX} ${s + 26} L${CX + 9} ${s}Z`} fill={P} />
          {v.accessoire !== "noeud" && <path d={`M${CX - 2} ${s + 3} L${CX + 2} ${s + 3} L${CX + 3} ${s + 22} L${CX} ${s + 26} L${CX - 3} ${s + 22}Z`} fill={E} />}
          <path d={`M${CX - 30} ${s + 4} L${CX - 9} ${s} L${CX - 2} ${s + 30}Z`} fill={T} />
          <path d={`M${CX + 30} ${s + 4} L${CX + 9} ${s} L${CX + 2} ${s + 30}Z`} fill={T} />
        </>
      );
  }
}
