// Dibujos SVG: planta y vehículos.
import { esc, n0, cant } from "./ui.js";

const pct = (m) => (m.capacidad > 0 ? Math.max(0, Math.min(1, m.stock / m.capacidad)) : 0);
const colorNivel = (m) => (m.stock <= 0 ? "#ef5a4c" : m.stock < m.minimo ? "#ffb020" : null);

function silo(m, x) {
  const w = 96, top = 70, h = 220, coneH = 52, p = pct(m);
  const alerta = colorNivel(m);
  const fillH = h * p;
  const id = `clip-${m.id}`;
  const cx = x + w / 2;
  return `
  <g class="clic" data-mat="${m.id}" role="button" tabindex="0" aria-label="${esc(m.nombre)}: ${Math.round(p * 100)}%">
    <defs><clipPath id="${id}"><path d="M${x} ${top} h${w} v${h} l${-w / 2 + 12} ${coneH} h-24 l${-w / 2 + 12} ${-coneH} z"/></clipPath></defs>
    <!-- patas -->
    <path d="M${x + 8} ${top + h} L${x + 2} 430 M${x + w - 8} ${top + h} L${x + w - 2} 430 M${x + 6} 395 L${x + w - 6} 395" stroke="#5b5754" stroke-width="5"/>
    <rect x="${cx - 9}" y="${top + h + coneH}" width="18" height="16" fill="#4a4644"/>
    <!-- cuerpo -->
    <path d="M${x} ${top} h${w} v${h} l${-w / 2 + 12} ${coneH} h-24 l${-w / 2 + 12} ${-coneH} z" fill="#2b2928"/>
    <g clip-path="url(#${id})">
      <rect x="${x}" y="${top + h + coneH - fillH - coneH * Math.min(1, p * 4)}" width="${w}" height="${fillH + coneH * 2}" fill="url(#g-cemento)"/>
      ${[1, 2, 3, 4].map((i) => `<line x1="${x}" x2="${x + w}" y1="${top + (h / 5) * i}" y2="${top + (h / 5) * i}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`).join("")}
    </g>
    <path class="cuerpo" d="M${x} ${top} h${w} v${h} l${-w / 2 + 12} ${coneH} h-24 l${-w / 2 + 12} ${-coneH} z" fill="none" stroke="${alerta || "#6b6662"}" stroke-width="${alerta ? 3 : 2}"/>
    <ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="10" fill="#3a3735" stroke="#6b6662" stroke-width="2"/>
    <rect x="${x}" y="${top + 10}" width="${w}" height="9" fill="#ffcc00"/>
    
    <text x="${cx}" y="${top + 120}" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.55)" stroke-width="4" paint-order="stroke">${Math.round(p * 100)}%</text>
    <text x="${cx}" y="${top - 18}" text-anchor="middle" font-size="15" font-weight="700" fill="#f2efe9">${esc(m.nombre.replace("Silo de cemento", "Silo"))}</text>
    <text x="${cx}" y="452" text-anchor="middle" font-size="14" font-weight="700" fill="${alerta || "#f2efe9"}">${cant(m.stock, "kg")}</text>
    <text x="${cx}" y="468" text-anchor="middle" font-size="11.5" fill="#8a847b">de ${cant(m.capacidad, "kg")}</text>
  </g>`;
}

function tanque(m, x) {
  const w = 130, top = 190, h = 140, p = pct(m), alerta = colorNivel(m);
  const fy = top + h - h * p;
  return `
  <g class="clic" data-mat="${m.id}" role="button" tabindex="0" aria-label="${esc(m.nombre)}: ${Math.round(p * 100)}%">
    <defs><clipPath id="clip-agua"><rect x="${x}" y="${top}" width="${w}" height="${h}" rx="14"/></clipPath></defs>
    <path d="M${x + 14} ${top + h} V430 M${x + w - 14} ${top + h} V430 M${x + 14} 400 H${x + w - 14}" stroke="#5b5754" stroke-width="5"/>
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="14" fill="#232829"/>
    <g clip-path="url(#clip-agua)">
      <path d="M${x} ${fy} q${w / 8} -7 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0 V${top + h} H${x} z" fill="url(#g-agua)"/>
    </g>
    <rect class="cuerpo" x="${x}" y="${top}" width="${w}" height="${h}" rx="14" fill="none" stroke="${alerta || "#6b6662"}" stroke-width="${alerta ? 3 : 2}"/>
    <rect x="${x}" y="${top + 18}" width="${w}" height="7" fill="#ffcc00"/>
    <text x="${x + w / 2}" y="${top + 85}" text-anchor="middle" font-size="28" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.5)" stroke-width="4" paint-order="stroke">${Math.round(p * 100)}%</text>
    <text x="${x + w / 2}" y="${top - 14}" text-anchor="middle" font-size="15" font-weight="700" fill="#f2efe9">Tanque de agua</text>
    <text x="${x + w / 2}" y="452" text-anchor="middle" font-size="14" font-weight="700" fill="${alerta || "#f2efe9"}">${n0(m.stock)} L</text>
    <text x="${x + w / 2}" y="468" text-anchor="middle" font-size="11.5" fill="#8a847b">de ${n0(m.capacidad)} L</text>
  </g>`;
}

function acopio(m, x, w, color, patron) {
  const p = pct(m), alerta = colorNivel(m);
  const base = 430, alto = 30 + 150 * p;
  const ancho = w - 16;
  const cx = x + w / 2;
  const pila = p > 0.001
    ? `<path d="M${x + 8} ${base} Q${cx - ancho * 0.25} ${base - alto * 0.9} ${cx} ${base - alto} Q${cx + ancho * 0.25} ${base - alto * 0.9} ${x + w - 8} ${base} z" fill="${color}"/>
       <path d="M${x + 8} ${base} Q${cx - ancho * 0.25} ${base - alto * 0.9} ${cx} ${base - alto} Q${cx + ancho * 0.25} ${base - alto * 0.9} ${x + w - 8} ${base} z" fill="url(#${patron})"/>`
    : "";
  return `
  <g class="clic" data-mat="${m.id}" role="button" tabindex="0" aria-label="${esc(m.nombre)}: ${Math.round(p * 100)}%">
    <rect class="cuerpo" x="${x}" y="${base - 200}" width="${w}" height="200" fill="rgba(255,255,255,0.015)" stroke="transparent"/>
    ${pila}
    <text x="${cx}" y="${base - alto - 30}" text-anchor="middle" font-size="15" font-weight="700" fill="#f2efe9">${esc(m.nombre)}</text>
    <text x="${cx}" y="${base - alto - 10}" text-anchor="middle" font-size="13" fill="${alerta || "#b5afa6"}">${Math.round(p * 100)}%</text>
    <text x="${cx}" y="452" text-anchor="middle" font-size="14" font-weight="700" fill="${alerta || "#f2efe9"}">${cant(m.stock, "kg")}</text>
  </g>`;
}

export function svgPlanta(mats) {
  const by = Object.fromEntries(mats.map((m) => [m.id, m]));
  const silos = mats.filter((m) => m.tipo === "cemento");
  const aridos = ["arena", "piedra620", "piedra06"].map((id) => by[id]).filter(Boolean);
  const colores = { arena: "#d9b26f", piedra620: "#7f7b77", piedra06: "#a19c96" };
  const patrones = { arena: "p-arena", piedra620: "p-piedra", piedra06: "p-piedra-fina" };
  const xS = (i) => 30 + i * 128;
  const xT = 30 + silos.length * 128 + 10;
  const xTorre = xT + 175;
  const x0A = xTorre + 150, wA = (1180 - x0A) / Math.max(aridos.length, 1);
  return `
  <svg class="planta-svg" viewBox="0 0 1200 480" role="img" aria-label="Vista de la planta">
    <defs>
      <linearGradient id="g-cemento" x1="0" x2="1"><stop offset="0" stop-color="#8f8a83"/><stop offset=".5" stop-color="#c2bdb5"/><stop offset="1" stop-color="#8f8a83"/></linearGradient>
      <linearGradient id="g-agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb3f5"/><stop offset="1" stop-color="#1f6fb8"/></linearGradient>
      <pattern id="p-arena" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="rgba(0,0,0,.18)"/><circle cx="6" cy="6" r=".7" fill="rgba(255,255,255,.2)"/></pattern>
      <pattern id="p-piedra" width="16" height="12" patternUnits="userSpaceOnUse"><ellipse cx="4" cy="4" rx="3.5" ry="2.6" fill="rgba(255,255,255,.14)"/><ellipse cx="12" cy="9" rx="3" ry="2.2" fill="rgba(0,0,0,.22)"/></pattern>
      <pattern id="p-piedra-fina" width="9" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,.16)"/><circle cx="6.5" cy="5.5" r="1.4" fill="rgba(0,0,0,.2)"/></pattern>
      <pattern id="p-rayas" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#ffcc00"/><rect x="7" width="7" height="14" fill="#1a1918"/></pattern>
    </defs>
    <rect x="0" y="430" width="1200" height="50" fill="#1a1918"/>
    <rect x="0" y="430" width="1200" height="4" fill="url(#p-rayas)" opacity=".8"/>
    ${silos.map((m, i) => silo(m, xS(i))).join("")}
    ${by.agua ? tanque(by.agua, xT) : ""}
    <!-- torre de carga / mezcladora -->
    <g aria-hidden="true">
      <rect x="${xTorre}" y="170" width="100" height="120" fill="#2b2928" stroke="#6b6662" stroke-width="2"/>
      <rect x="${xTorre}" y="170" width="100" height="10" fill="#ffcc00"/>
      <text x="${xTorre + 50}" y="225" text-anchor="middle" font-size="12" font-weight="700" fill="#b5afa6">BALANZA</text>
      <text x="${xTorre + 50}" y="242" text-anchor="middle" font-size="12" font-weight="700" fill="#b5afa6">Y CARGA</text>
      <path d="M${xTorre + 30} 290 l20 30 l20 -30" fill="#3a3735" stroke="#6b6662" stroke-width="2"/>
      <path d="M${xTorre + 8} 290 V430 M${xTorre + 92} 290 V430" stroke="#5b5754" stroke-width="6"/>
      <path d="M${xTorre + 100} 200 L${x0A + 20} 360" stroke="#5b5754" stroke-width="10" stroke-linecap="round"/>
      <path d="M${xTorre + 100} 200 L${x0A + 20} 360" stroke="#1a1918" stroke-width="4" stroke-dasharray="6 8"/>
      ${silos.map((_, i) => `<path d="M${xS(i) + 84} 64 V22 H${xTorre + 50} V170" stroke="#4a4644" stroke-width="4" fill="none"/>`).join("")}
    </g>
    ${aridos.map((m, i) => acopio(m, x0A + i * wA, wA, colores[m.id], patrones[m.id])).join("")}
    ${aridos.slice(1).map((_, i) => `<rect x="${x0A + (i + 1) * wA - 5}" y="350" width="10" height="80" fill="#55514e"/>`).join("")}
  </svg>`;
}

// ---------------------------------------------------------------- vehículos
export function svgVehiculo(v) {
  const t = v.tipo;
  const amarillo = "#ffcc00", carbon = "#3a3735", gris = "#8a847b";
  const ruedas = (xs, y = 52, r = 8) => xs.map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#111" stroke="${gris}" stroke-width="2.5"/>`).join("");
  let cuerpo = "";
  if (t === "mixer") {
    const semi = /semi/i.test(v.denominacion);
    cuerpo = semi
      ? `<rect x="6" y="20" width="22" height="24" rx="3" fill="${carbon}" stroke="${gris}"/><rect x="10" y="24" width="12" height="9" fill="#5f8fb3"/>
         <rect x="28" y="40" width="160" height="6" fill="${carbon}"/>
         <g><ellipse cx="110" cy="27" rx="62" ry="17" fill="${amarillo}" transform="rotate(-8 110 27)"/><path d="M60 22 l90 -10 M62 34 l92 -12" stroke="#1a1918" stroke-width="3" opacity=".5"/></g>
         ${ruedas([18, 140, 160, 180])}`
      : `<rect x="8" y="18" width="34" height="28" rx="4" fill="${carbon}" stroke="${gris}"/><rect x="13" y="22" width="18" height="11" fill="#5f8fb3"/>
         <rect x="42" y="40" width="148" height="6" fill="${carbon}"/>
         <g><ellipse cx="118" cy="26" rx="58" ry="18" fill="${amarillo}" transform="rotate(-10 118 26)"/><path d="M72 22 l84 -14 M74 35 l86 -14" stroke="#1a1918" stroke-width="3" opacity=".5"/>
         <path d="M170 20 l14 -6 v14 z" fill="${carbon}"/></g>
         ${ruedas([25, 130, 152, 174])}`;
  } else if (t === "bomba") {
    cuerpo = /pluma/i.test(v.denominacion)
      ? `<rect x="8" y="20" width="32" height="26" rx="4" fill="${carbon}" stroke="${gris}"/><rect x="13" y="24" width="16" height="10" fill="#5f8fb3"/>
         <rect x="40" y="36" width="150" height="10" fill="${carbon}"/><path d="M60 34 L120 8 L185 14" stroke="${amarillo}" stroke-width="7" fill="none" stroke-linecap="round"/>
         ${ruedas([24, 120, 145, 170])}`
      : `<rect x="40" y="18" width="110" height="26" rx="5" fill="${amarillo}"/><path d="M40 44 H150 M20 40 L40 34" stroke="${carbon}" stroke-width="5"/>
         <rect x="150" y="26" width="30" height="10" fill="${carbon}"/>${ruedas([95])}`;
  } else if (t === "tolva") {
    cuerpo = `<rect x="6" y="18" width="30" height="28" rx="4" fill="${carbon}" stroke="${gris}"/><rect x="11" y="22" width="15" height="10" fill="#5f8fb3"/>
      <path d="M44 14 h140 v22 l-20 10 h-100 l-20 -10 z" fill="#b5afa6" stroke="${gris}"/><rect x="44" y="14" width="140" height="5" fill="${amarillo}"/>
      ${ruedas([20, 150, 170])}`;
  } else if (t === "equipo") {
    const d = (v.denominacion || "").toLowerCase();
    if (d.includes("motoniveladora")) {
      cuerpo = `<rect x="130" y="14" width="40" height="30" rx="4" fill="${amarillo}"/><rect x="138" y="18" width="22" height="12" fill="#5f8fb3"/>
        <path d="M20 34 H140" stroke="${amarillo}" stroke-width="8"/><path d="M60 44 l40 0 l-6 6 h-28 z" fill="${gris}"/>${ruedas([24, 140, 165])}`;
    } else if (d.includes("compactador")) {
      cuerpo = `<rect x="70" y="14" width="60" height="30" rx="5" fill="${amarillo}"/><rect x="80" y="18" width="24" height="12" fill="#5f8fb3"/>
        <rect x="18" y="30" width="50" height="28" rx="14" fill="${gris}" stroke="#111" stroke-width="2"/>${ruedas([150], 50, 10)}`;
    } else if (d.includes("oruga") || d.includes("retroexcavadora")) {
      const oruga = d.includes("oruga");
      cuerpo = `<rect x="40" y="16" width="70" height="28" rx="4" fill="${amarillo}"/><rect x="48" y="20" width="22" height="12" fill="#5f8fb3"/>
        <path d="M108 22 L150 2 L178 30 L170 40" stroke="${amarillo}" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M164 34 l16 10 l-14 6 z" fill="${gris}"/>
        ${oruga ? `<rect x="30" y="44" width="92" height="14" rx="7" fill="#111" stroke="${gris}" stroke-width="2.5"/>` : ruedas([50, 100]) + `<path d="M40 40 l-24 8 v8 h16" fill="${gris}"/>`}`;
    } else {
      cuerpo = `<rect x="70" y="12" width="60" height="32" rx="4" fill="${amarillo}"/><rect x="80" y="16" width="26" height="12" fill="#5f8fb3"/>
        <path d="M70 30 L38 30 L30 44" stroke="${amarillo}" stroke-width="6" fill="none"/><path d="M14 30 h26 l-4 20 h-26 z" fill="${gris}"/>${ruedas([90, 140], 50, 10)}`;
    }
  } else {
    const dRiego = /regador/i.test(v.denominacion);
    cuerpo = `<rect x="8" y="18" width="34" height="28" rx="4" fill="${carbon}" stroke="${gris}"/><rect x="13" y="22" width="18" height="11" fill="#5f8fb3"/>
      ${t === "tractor" ? `<rect x="42" y="38" width="40" height="8" fill="${carbon}"/>${ruedas([25, 66])}`
      : t === "semirremolque" ? `<path d="M10 22 h170 v18 h-170 z" fill="${/carret/i.test(v.denominacion) ? carbon : amarillo}"/>${ruedas([140, 160, 180])}`
      : dRiego ? `<rect x="46" y="18" width="130" height="26" rx="13" fill="#5f8fb3"/>${ruedas([25, 140, 165])}`
      : `<path d="M46 16 h134 l-8 28 h-126 z" fill="${amarillo}"/>${ruedas([25, 130, 155])}`}`;
  }
  return `<svg class="veh" viewBox="0 0 200 64" aria-hidden="true">${cuerpo}</svg>`;
}
