import { esc, n0, $, modal, leerForm, campo, toast, icon, badge, requerir } from "../ui.js";

const CAMPOS = [
  ["cemento_kg", "Cemento (kg)"],
  ["piedra620_kg", "Piedra 6/20 (kg)"],
  ["piedra06_kg", "Piedra 0/6 (kg)"],
  ["arena_kg", "Arena (kg)"],
  ["agua_l", "Agua (L)"],
];

async function formFormula(ctx, f = {}) {
  const ok = await modal({
    title: f.id ? `Fórmula ${f.nombre}` : "Nueva fórmula",
    wide: true,
    body: `<p class="muted" style="margin-top:0">Cantidades para <b>1 m³</b>. Al emitir un remito se multiplican por los m³ y se descuentan del stock.</p>
      <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${campo("Nombre", `<input name="nombre" required value="${esc(f.nombre)}" placeholder="Ej: H21">`)}
        ${campo("Precio por m³ ($)", `<input name="precio_m3" type="number" min="0" step="0.01" value="${f.precio_m3 ?? 0}">`)}
        ${campo("Orden", `<input name="orden" type="number" value="${f.orden ?? 50}">`)}
        ${CAMPOS.map(([k, t]) => campo(t, `<input name="${k}" type="number" min="0" step="any" value="${f[k] ?? 0}">`)).join("")}
        <label class="check"><input type="checkbox" name="activa" ${f.activa !== false ? "checked" : ""}> Activa</label>
      </div>`,
    onOk: async (form) => {
      const o = leerForm(form);
      requerir(o, { nombre: "el nombre" });
      for (const [k] of CAMPOS) o[k] = o[k] ?? 0;
      o.precio_m3 = o.precio_m3 ?? 0;
      if (f.id) o.id = f.id;
      await ctx.api.formulas.guardar(o);
    },
  });
  if (ok) toast("Fórmula guardada.");
  return ok;
}

export async function render(el, ctx) {
  const fs = await ctx.api.formulas.list();
  const sinPrecio = fs.filter((f) => f.activa && !(f.precio_m3 > 0));
  el.innerHTML = `
    <div class="barra">
      ${ctx.esAdmin ? `<button class="btn btn-primary btn-big" id="nueva">${icon("mas")} Nueva fórmula</button>` : `<p class="muted" style="margin:0">Solo el administrador puede cambiar fórmulas y precios.</p>`}
    </div>
    ${sinPrecio.length ? `<div class="alerta">${icon("alerta")} Sin precio: ${sinPrecio.map((f) => esc(f.nombre)).join(", ")}. Los remitos de esos tipos salen en $0 hasta cargarlo.</div>` : ""}
    <div class="tabla-wrap"><table>
      <thead><tr><th>Tipo</th>${CAMPOS.map(([, t]) => `<th class="num">${t}</th>`).join("")}<th class="num">Precio m³</th><th></th></tr></thead>
      <tbody>${fs.map((f) => `<tr ${f.activa ? "" : 'style="opacity:.5"'}>
        <td><b style="font-size:16px">${esc(f.nombre)}</b> ${f.activa ? "" : badge("inactiva", "muted")}</td>
        ${CAMPOS.map(([k]) => `<td class="num">${n0(f[k])}</td>`).join("")}
        <td class="num"><b>${f.precio_m3 > 0 ? $(f.precio_m3) : '<span class="mal-t">sin precio</span>'}</b></td>
        <td class="num">${ctx.esAdmin ? `<button class="btn btn-sm" data-id="${f.id}">Editar</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>`;
  el.querySelector("#nueva")?.addEventListener("click", async () => (await formFormula(ctx)) && ctx.recargar());
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-id]");
    if (b && (await formFormula(ctx, fs.find((f) => f.id === Number(b.dataset.id))))) ctx.recargar();
  });
}
