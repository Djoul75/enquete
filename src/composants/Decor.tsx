import type { ReactNode } from "react";
import type { DecorId } from "../lib/visuels";

// Décors des lieux, en aplats noirs et blanc cassé : une lumière dure, des
// formes simples, une touche de rouge. Cadre 160 × 100.

const E = "#0b0b0b";
const P = "#ede8dd";
const R = "#d7261e";
const F = "#1a1916";
const T = "#2a2925";
const T2 = "#3a3833";
const G = "#8a867e";

const DECORS: Record<DecorId, ReactNode> = {
  bureau: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="96" y="8" width="46" height="54" fill={P} />
      <path d="M96 15h46v3H96Z M96 23h46v3H96Z M96 31h46v3H96Z M96 39h46v3H96Z M96 47h46v3H96Z M96 55h46v3H96Z" fill={E} />
      <rect x="118" y="8" width="2" height="54" fill={E} />
      <path d="M96 62 L142 62 L104 100 L30 100Z" fill={P} opacity="0.1" />
      <path d="M12 66 L92 66 L92 72 L12 72Z" fill={T} />
      <rect x="16" y="72" width="5" height="28" fill={T} />
      <rect x="83" y="72" width="5" height="28" fill={T} />
      <path d="M24 66 L28 50 L36 44" stroke={T2} strokeWidth="2" fill="none" />
      <path d="M32 40 L45 46 L41 51 L30 44Z" fill={T2} />
      <path d="M41 49 L60 66 L34 66Z" fill={P} opacity="0.18" />
      <ellipse cx="68" cy="63" rx="11" ry="3.2" fill={E} stroke={T2} strokeWidth="0.8" />
      <ellipse cx="68" cy="63" rx="2.6" ry="1" fill={R} />
      <path d="M48 100 L48 76 C48 71 64 71 64 76 L64 100Z" fill={F} />
    </>
  ),
  quai: (
    <>
      <rect width="160" height="100" fill={E} />
      <circle cx="122" cy="24" r="18" fill={P} opacity="0.08" />
      <circle cx="122" cy="24" r="4" fill={P} />
      <rect x="121" y="27" width="2" height="39" fill={T2} />
      <path d="M0 66 L0 18 L24 18 L24 32 L46 32 L46 66Z" fill={F} />
      <rect x="31" y="38" width="7" height="9" fill={P} />
      <path d="M58 64 L104 64 L98 72 L64 72Z" fill={F} />
      <rect x="80" y="34" width="1.5" height="30" fill={T2} />
      <rect x="0" y="66" width="160" height="4" fill={T2} />
      <path d="M118 77h8 M114 83h15 M120 89h6 M116 95h10 M31 78h7 M32 84h5" stroke={P} strokeWidth="1" opacity="0.3" />
      <path d="M136 66 L136 58 C136 55 144 55 144 58 L144 66Z" fill={T} />
    </>
  ),
  bar: (
    <>
      <rect width="160" height="100" fill={E} />
      <path d="M74 22 L86 22 L124 70 L36 70Z" fill={P} opacity="0.08" />
      <rect x="79" y="0" width="1.5" height="16" fill={T2} />
      <path d="M70 16 L90 16 L86 22 L74 22Z" fill={G} />
      <rect x="8" y="32" width="144" height="2" fill={T} />
      <rect x="8" y="50" width="144" height="2" fill={T} />
      <path d="M14 32 v-10 h3 v-4 h2 v4 h3 v10Z M28 32 v-12 h2 v-5 h2 v5 h2 v12Z M40 32 v-8 h6 v8Z M120 32 v-11 h3 v-4 h2 v4 h3 v11Z M134 32 v-9 h7 v9Z M16 50 v-9 h6 v9Z M30 50 v-11 h3 v-4 h2 v4 h3 v11Z M124 50 v-12 h2 v-5 h2 v5 h2 v12Z M138 50 v-8 h6 v8Z" fill={T} />
      <rect x="29" y="22" width="1" height="8" fill={P} opacity="0.5" />
      <rect x="125" y="40" width="1" height="8" fill={R} opacity="0.8" />
      <rect x="0" y="70" width="160" height="6" fill={T2} />
      <rect x="0" y="76" width="160" height="24" fill={F} />
      <path d="M62 61 L70 61 L68 70 L64 70Z" fill="none" stroke={P} strokeWidth="0.8" />
      <rect x="96" y="62" width="10" height="8" fill="none" stroke={P} strokeWidth="0.8" opacity="0.6" />
    </>
  ),
  loge: (
    <>
      <rect width="160" height="100" fill={F} />
      <rect x="44" y="12" width="58" height="46" fill={T} />
      <rect x="51" y="19" width="44" height="32" fill={E} />
      <path d="M58 51 C58 40 64 36 68 36 C72 36 78 40 78 51Z" fill={F} />
      {[47.5, 59, 70.5, 82, 93.5].map((x) => <circle key={x} cx={x} cy="15.5" r="2.4" fill={P} />)}
      {[27, 38.5, 50].map((y) => <circle key={`g${y}`} cx="47.5" cy={y} r="2.4" fill={P} opacity={y === 50 ? 0.3 : 1} />)}
      {[27, 38.5, 50].map((y) => <circle key={`d${y}`} cx="98.5" cy={y} r="2.4" fill={P} />)}
      <rect x="30" y="62" width="86" height="5" fill={T2} />
      <rect x="40" y="54" width="5" height="8" fill={P} opacity="0.5" />
      <rect x="56" y="57" width="3" height="5" fill={R} />
      <path d="M134 6 q4 0 4 4 l-4 4" stroke={G} strokeWidth="1" fill="none" />
      <path d="M124 20 L134 14 L144 20" stroke={G} strokeWidth="1.2" fill="none" />
      <path d="M126 20 L142 20 L140 34 L152 80 L116 80 L128 34Z" fill={R} />
      <rect x="62" y="80" width="20" height="4" fill={T2} />
      <rect x="64" y="84" width="2" height="16" fill={T2} />
      <rect x="78" y="84" width="2" height="16" fill={T2} />
    </>
  ),
  chambre: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="16" y="10" width="34" height="46" fill={P} />
      <path d="M33 10 V56 M16 33 H50" stroke={E} strokeWidth="2" />
      <path d="M16 10 C22 30 20 50 12 60 L8 60 L8 10Z M50 10 C44 30 46 50 54 60 L58 60 L58 10Z" fill={T} />
      <path d="M16 56 L50 56 L80 100 L0 100 L0 80Z" fill={P} opacity="0.08" />
      <path d="M70 70 L150 70 L150 88 L70 88Z" fill={T} />
      <path d="M70 70 C70 62 86 60 92 62 L92 70Z" fill={P} opacity="0.85" />
      <path d="M140 50 L150 50 L150 88 L140 88Z" fill={F} />
      <rect x="70" y="88" width="4" height="12" fill={T} />
      <rect x="146" y="88" width="4" height="12" fill={T} />
      <path d="M96 72 C110 66 130 68 140 74 L140 88 L96 88Z" fill={F} />
      <rect x="112" y="40" width="1.5" height="18" fill={T2} />
      <path d="M106 34 L120 34 L117 40 L109 40Z" fill={G} />
      <path d="M109 40 L117 40 L126 58 L100 58Z" fill={P} opacity="0.12" />
      <rect x="102" y="58" width="22" height="3" fill={T2} />
      <rect x="114" y="54" width="2" height="4" fill={R} />
    </>
  ),
  cabine: (
    <>
      <rect width="160" height="100" fill={F} />
      <path d="M0 0 H160 V100 H0Z" fill="none" />
      {[0, 20, 40, 60, 80, 100, 120, 140].map((x) => <rect key={x} x={x} y="0" width="1" height="100" fill={T} />)}
      <circle cx="56" cy="38" r="20" fill={T2} />
      <circle cx="56" cy="38" r="15" fill={P} />
      <path d="M41 44 C50 41 62 46 71 42 L71 53 L41 53Z" fill={G} opacity="0.6" />
      <circle cx="62" cy="31" r="3" fill={E} opacity="0.2" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <circle key={a} cx={56 + 17.5 * Math.cos((a * Math.PI) / 180)} cy={38 + 17.5 * Math.sin((a * Math.PI) / 180)} r="1.2" fill={E} />
      ))}
      <path d="M45 53 L67 53 L96 100 L10 100Z" fill={P} opacity="0.08" />
      <path d="M96 64 L160 64 L160 84 L96 84Z" fill={T} />
      <path d="M96 64 C96 58 108 56 114 58 L114 64Z" fill={P} opacity="0.8" />
      <rect x="10" y="70" width="26" height="30" fill={E} />
      <rect x="14" y="74" width="18" height="10" fill={T} />
      <circle cx="23" cy="89" r="1.4" fill={R} />
    </>
  ),
  compartiment: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="40" y="14" width="80" height="40" rx="6" fill={T2} />
      <rect x="44" y="18" width="72" height="32" rx="4" fill={F} />
      <circle cx="98" cy="28" r="4" fill={P} />
      <path d="M44 42 L60 36 L72 40 L88 32 L104 38 L116 34 L116 50 L44 50Z" fill={E} />
      <path d="M44 46 h12 M62 44 h8 M80 47 h14 M100 45 h10" stroke={P} strokeWidth="0.8" opacity="0.4" />
      <path d="M0 52 L30 52 L30 80 L0 80Z" fill={T} />
      <path d="M130 52 L160 52 L160 80 L130 80Z" fill={T} />
      <path d="M0 80 H34 V100 H0Z M126 80 H160 V100 H126Z" fill={F} />
      <rect x="62" y="58" width="36" height="3" fill={T2} />
      <rect x="78" y="61" width="4" height="39" fill={T2} />
      <path d="M70 58 L74 52 L78 58Z" fill={P} opacity="0.7" />
      <rect x="86" y="55" width="4" height="3" fill={R} />
      <path d="M0 8 H160" stroke={T2} strokeWidth="2" />
    </>
  ),
  couloir: (
    <>
      <rect width="160" height="100" fill={E} />
      <path d="M0 0 L62 34 L98 34 L160 0Z" fill={F} />
      <path d="M0 100 L62 66 L98 66 L160 100Z" fill={T} />
      <rect x="62" y="34" width="36" height="32" fill={P} />
      <path d="M76 66 L76 46 C76 43 84 43 84 46 L84 66Z" fill={E} />
      <path d="M62 66 L98 66 L130 100 L30 100Z" fill={P} opacity="0.1" />
      <path d="M14 10 L14 92 L26 85 L26 17Z M44 26 L44 76 L52 72 L52 30Z" fill={T} />
      <path d="M146 10 L146 92 L134 85 L134 17Z M116 26 L116 76 L108 72 L108 30Z" fill={T} />
      <circle cx="49" cy="52" r="1.2" fill={R} />
      <path d="M0 8 L62 37 M160 8 L98 37" stroke={T2} strokeWidth="1" />
    </>
  ),
  scene: (
    <>
      <rect width="160" height="100" fill={E} />
      <path d="M0 0 H34 C30 30 34 60 26 100 H0Z" fill={R} opacity="0.85" />
      <path d="M160 0 H126 C130 30 126 60 134 100 H160Z" fill={R} opacity="0.85" />
      <path d="M10 0 C8 40 12 70 8 100 M20 0 C18 40 22 70 18 100 M150 0 C152 40 148 70 152 100 M140 0 C142 40 138 70 142 100" stroke={E} strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M0 0 H160 V10 C120 16 40 16 0 10Z" fill={R} />
      <path d="M72 0 L88 0 L118 82 L42 82Z" fill={P} opacity="0.12" />
      <ellipse cx="80" cy="82" rx="38" ry="6" fill={P} opacity="0.22" />
      <rect x="79" y="40" width="2" height="42" fill={G} />
      <rect x="76" y="34" width="8" height="10" rx="4" fill={G} />
      <path d="M72 82 L88 82 L80 78Z" fill={G} />
      <rect x="0" y="86" width="160" height="14" fill={F} />
      <path d="M0 86 H160" stroke={T2} strokeWidth="1.5" />
    </>
  ),
  terrasse: (
    <>
      <rect width="160" height="100" fill={E} />
      <circle cx="122" cy="20" r="9" fill={P} />
      <circle cx="122" cy="20" r="16" fill={P} opacity="0.06" />
      <path d="M0 62 L30 36 L48 50 L76 22 L104 50 L120 40 L160 64 V70 H0Z" fill={F} />
      <path d="M76 22 L84 30 L80 32 L72 28Z M30 36 L36 42 L26 40Z" fill={P} opacity="0.8" />
      <rect x="0" y="64" width="160" height="3" fill={T2} />
      {[6, 18, 30, 42, 54, 66, 78, 90, 102, 114, 126, 138, 150].map((x) => <rect key={x} x={x} y="67" width="3" height="15" fill={T2} />)}
      <rect x="0" y="82" width="160" height="18" fill={T} />
      <path d="M0 90 L160 86" stroke={P} strokeWidth="0.6" opacity="0.15" />
      <rect x="40" y="84" width="1.5" height="12" fill={G} />
      <path d="M34 84 L48 84 L46 80 L36 80Z" fill={G} />
      <path d="M38 84 L44 84 L43 86 L39 86Z" fill={R} />
    </>
  ),
  piscine: (
    <>
      <rect width="160" height="100" fill={E} />
      <circle cx="30" cy="18" r="7" fill={P} />
      <path d="M100 48 C104 30 116 22 124 20 M124 20 C118 26 116 34 118 40 M124 20 C130 24 136 30 136 38 M124 20 C122 28 126 34 132 36" stroke={T2} strokeWidth="2" fill="none" />
      <rect x="100" y="20" width="1.5" height="30" fill={T2} />
      <path d="M0 50 H160 V56 H0Z" fill={T2} />
      <path d="M10 56 L150 56 L160 100 L0 100Z" fill={F} />
      <path d="M16 64 h20 M50 70 h30 M96 62 h24 M30 82 h36 M100 80 h30 M60 92 h28" stroke={P} strokeWidth="1" opacity="0.28" />
      <path d="M22 58 C40 62 60 60 80 64" stroke={P} strokeWidth="0.8" opacity="0.2" fill="none" />
      <rect x="134" y="40" width="1.5" height="16" fill={G} />
      <rect x="140" y="40" width="1.5" height="16" fill={G} />
      <path d="M134 44 h7.5 M134 49 h7.5" stroke={G} strokeWidth="1" />
      <path d="M58 46 L66 46 L72 50 L52 50Z" fill={T} />
      <rect x="61" y="40" width="1.5" height="6" fill={T2} />
      <ellipse cx="70" cy="74" rx="5" ry="1.6" fill={R} opacity="0.85" />
    </>
  ),
  radio: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="18" y="14" width="124" height="56" fill={T} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={36 + i * 30} cy="30" r="8" fill={E} />
          <circle cx={36 + i * 30} cy="30" r="6" fill="none" stroke={G} strokeWidth="0.8" />
          <path d={`M${36 + i * 30} 30 L${36 + i * 30 + (i % 2 ? 4 : -3)} ${26 + i}`} stroke={i === 2 ? R : P} strokeWidth="1.2" />
        </g>
      ))}
      {Array.from({ length: 10 }, (_, i) => <circle key={`j${i}`} cx={28 + i * 11.5} cy="52" r="1.8" fill={i % 3 ? E : P} />)}
      <path d="M30 52 C40 80 70 76 74 52 M86 52 C94 70 110 72 120 52" stroke={P} strokeWidth="0.8" opacity="0.5" fill="none" />
      <rect x="10" y="70" width="140" height="5" fill={T2} />
      <rect x="10" y="75" width="140" height="25" fill={F} />
      <path d="M60 60 L72 42 L84 42 L96 60Z" fill={P} opacity="0.06" />
      <path d="M108 64 C108 56 120 56 120 64" stroke={G} strokeWidth="2" fill="none" />
      <rect x="104" y="64" width="6" height="6" rx="2" fill={G} />
      <rect x="118" y="64" width="6" height="6" rx="2" fill={G} />
    </>
  ),
  ecurie: (
    <>
      <rect width="160" height="100" fill={E} />
      {[0, 8, 16, 24, 32, 40, 48].map((y) => <rect key={y} x="0" y={y} width="160" height="7" fill={F} />)}
      <path d="M0 56 H160" stroke={T2} strokeWidth="2" />
      <rect x="60" y="0" width="40" height="56" fill={E} />
      <path d="M60 0 L100 0 L100 4 L60 4Z" fill={T2} />
      <path d="M66 8 L94 8 L98 56 L62 56Z" fill={P} opacity="0.1" />
      <path d="M72 40 C70 30 76 20 84 18 C88 17 90 20 88 24 C86 30 84 36 86 44Z" fill={T} />
      {[0, 8, 16, 24, 32].map((x) => <rect key={x} x={x} y="56" width="6" height="44" fill={T} />)}
      {[128, 136, 144, 152].map((x) => <rect key={x} x={x} y="56" width="6" height="44" fill={T} />)}
      <path d="M0 64 H38 M0 88 H38 M128 64 H160 M128 88 H160" stroke={T2} strokeWidth="2" />
      <path d="M40 100 L44 76 L120 76 L124 100Z" fill={P} opacity="0.06" />
      <path d="M50 90 C56 86 70 88 74 94 C66 98 56 98 50 90Z" fill={G} opacity="0.5" />
      <path d="M108 30 C108 24 116 24 116 30 L116 36 L114 36 L114 30 C114 27 110 27 110 30 L110 36 L108 36Z" fill={G} />
      <path d="M140 20 C148 22 152 30 148 40 L144 40 C146 32 144 26 136 24Z" fill={R} opacity="0.9" />
    </>
  ),
  atelier: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="79" y="0" width="1" height="18" fill={T2} />
      <circle cx="80" cy="21" r="3" fill={P} />
      <path d="M77 22 L83 22 L130 90 L30 90Z" fill={P} opacity="0.07" />
      <circle cx="40" cy="58" r="20" fill={T} />
      <circle cx="40" cy="58" r="12" fill={F} />
      <circle cx="40" cy="58" r="4" fill={T2} />
      <circle cx="118" cy="56" r="22" fill={T} />
      <circle cx="118" cy="56" r="14" fill={F} />
      <circle cx="118" cy="56" r="5" fill={T2} />
      <path d="M40 38 L118 34 M40 78 L118 78" stroke={T2} strokeWidth="2" />
      <path d="M52 50 L104 46 L104 66 L52 66Z" fill={P} opacity="0.75" />
      <path d="M58 54 h20 M58 58 h40 M58 62 h30" stroke={E} strokeWidth="1" opacity="0.6" />
      <rect x="0" y="86" width="160" height="14" fill={F} />
      <path d="M0 86 H160" stroke={T2} strokeWidth="1.5" />
      <rect x="140" y="76" width="10" height="10" fill={T2} />
      <rect x="142" y="73" width="6" height="3" fill={R} />
    </>
  ),
  coffre: (
    <>
      <rect width="160" height="100" fill={E} />
      {[20, 32, 44, 56, 68, 80, 92, 104, 116, 128, 140].map((x) => <rect key={x} x={x} y="0" width="2" height="54" fill={T} />)}
      <rect x="0" y="54" width="160" height="5" fill={T2} />
      <rect x="0" y="59" width="160" height="41" fill={F} />
      <rect x="60" y="10" width="40" height="34" fill={P} opacity="0.12" />
      <rect x="104" y="20" width="44" height="50" fill={T} />
      <rect x="108" y="24" width="36" height="42" fill={E} />
      <circle cx="126" cy="45" r="8" fill="none" stroke={G} strokeWidth="1.5" />
      <path d="M126 37 V53 M118 45 H134" stroke={G} strokeWidth="1" />
      <path d="M86 24 L104 20 L104 70 L86 76Z" fill={T2} />
      <path d="M20 50 L50 50 L52 54 L18 54Z" fill={T2} />
      <rect x="26" y="44" width="12" height="6" fill={P} opacity="0.7" />
      <rect x="28" y="40" width="10" height="4" fill={P} opacity="0.5" />
      <circle cx="44" cy="48" r="3" fill={R} />
      <circle cx="44" cy="48" r="1.2" fill={E} />
    </>
  ),
  phare: (
    <>
      <rect width="160" height="100" fill={E} />
      <path d="M80 40 L0 10 L0 34Z" fill={P} opacity="0.1" />
      <path d="M80 40 L160 22 L160 52Z" fill={P} opacity="0.14" />
      <rect x="60" y="20" width="40" height="40" fill={T} />
      {[60, 73, 86, 99].map((x) => <rect key={x} x={x} y="20" width="1.5" height="40" fill={E} />)}
      <circle cx="80" cy="40" r="11" fill={P} />
      <circle cx="80" cy="40" r="7" fill="none" stroke={G} strokeWidth="0.8" />
      <circle cx="80" cy="40" r="3" fill={P} />
      <path d="M56 20 L104 20 L94 10 L66 10Z" fill={T2} />
      <rect x="40" y="60" width="80" height="4" fill={T2} />
      {[42, 52, 62, 72, 82, 92, 102, 112].map((x) => <rect key={x} x={x} y="64" width="1.5" height="14" fill={T2} />)}
      <rect x="40" y="78" width="80" height="2" fill={T2} />
      <path d="M0 88 C30 84 50 92 80 88 C110 84 130 92 160 88 V100 H0Z" fill={F} />
      <path d="M10 94 h14 M60 96 h20 M120 94 h18" stroke={P} strokeWidth="0.8" opacity="0.25" />
      <rect x="114" y="54" width="4" height="6" fill={R} />
    </>
  ),
  piece: (
    <>
      <rect width="160" height="100" fill={E} />
      <rect x="79" y="0" width="1" height="20" fill={T2} />
      <circle cx="80" cy="23" r="3" fill={P} />
      <path d="M77 24 L83 24 L120 100 L40 100Z" fill={P} opacity="0.07" />
      <rect x="18" y="20" width="34" height="66" fill={T} />
      <path d="M22 24 L44 28 L44 86 L22 86Z" fill={P} opacity="0.85" />
      <path d="M22 86 L44 86 L70 100 L10 100Z" fill={P} opacity="0.1" />
      <rect x="0" y="86" width="160" height="14" fill={F} />
      <path d="M104 86 L104 60 C104 54 124 54 124 60 L124 86Z" fill={T} />
      <rect x="100" y="70" width="28" height="4" fill={T2} />
      <rect x="132" y="40" width="20" height="26" fill={T} />
      <rect x="135" y="43" width="14" height="20" fill={F} />
      <rect x="112" y="66" width="4" height="4" fill={R} />
    </>
  ),
};

export function Decor({ id, label, assombri, cadrage = "meet" }: { id: DecorId; label?: string; assombri?: boolean; cadrage?: "meet" | "slice" }) {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio={cadrage === "slice" ? "xMidYMid slice" : "xMidYMid meet"}
      style={{ display: "block", width: "100%", height: cadrage === "slice" ? "100%" : "auto", opacity: assombri ? 0.4 : 1 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {DECORS[id]}
    </svg>
  );
}
