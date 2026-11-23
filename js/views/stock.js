import { esc, n0, cant, fechaHora, modal, leerForm, campo, toast, icon, opciones, vacio, badge } from "../ui.js";

const TIPOS = { ingreso: ["Ingreso", "ok"], consumo: ["Consumo", ""], ajuste: ["Ajuste", "info"], anulacion: ["Devolución", "warn"] };

/** Modal de Ingreso / Ajuste para un material. Devuelve true si cambió. */
export async function abrirMovimiento(ctx, m, modo = "ingreso") {
  const esKg = m.unidad === "kg";
  const r = await modal({
    title: m.nombre,
    body: `
      <p class="muted" style="margin-top:0">Hoy el sistema marca <b style="color:var(--texto)">${cant(m.stock, m.unidad)}</b>
        (${n0(m.stock)} ${m.unidad}) de ${cant(m.capacidad, m.unidad)}.</p>
      <div class="medios" style="grid-template-columns:1fr 1fr;margin-bottom:14px">
        <label><input type="radio" name="modo" value="ingreso" ${modo === "ingreso" ? "checked" : ""}>Entró material</label>
        <label><input type="radio" name="modo" value="ajuste" ${modo === "ajuste" ? "checked" : ""}>Medí el nivel real</label>
      </div>
      <div class="form-grid">
        ${campo("Cantidad", `<input name="cantidad" type="number" min="0" step="any" required inputmode="decimal">`)}
        ${campo("Unidad", `<select name="u">${esKg ? `<option value="kg">kg</option><option value="t">toneladas</option>` : `<option value="L">litros</option>`}</select>`)}
        ${campo("Nota (opcional)", `<input name="nota" placeholder="${modo === "ingreso" ? "Ej: remito proveedor 1234, camión AB123CD" : "Ej: medición con cinta"}">`, "full")}
      </div>
      <p class="ayuda" id="ayuda-modo"></p>`,
    okText: "Registrar",
    onOk: async (f) => {
      const o = leerForm(f);
      const modoSel = f.querySelector("input[name=modo]:checked").value;
      if (o.cantidad === null || o.cantidad < 0) throw new Error("Indicá la cantidad.");
      const valor = o.u === "t" ? o.cantidad * 1000 : o.cantidad;
      if (modoSel === "ingreso") await ctx.api.materiales.ingreso(m.id, valor, o.nota);
      else await ctx.api.materiales.ajuste(m.id, valor, o.nota);
      return modoSel;
    },
  });
  if (r) toast(r === "ingreso" ? "Ingreso registrado." : "Nivel corregido.");
  return !!r;
}
// texto de ayuda según el modo
document.addEventListener("change", (e) => {
  if (e.target.name !== "modo") return;
  const a = document.getElementById("ayuda-modo");
  if (a) a.textContent = e.target.value === "ajuste" ? "Escribí cuánto hay REALMENTE. El sistema corrige la diferencia y queda registrado." : "";
});

export async function render(el, ctx) {
  const [mats, movs] = await Promise.all([ctx.api.materiales.list(), ctx.api.materiales.movimientos({ limite: 150 })]);
  const bajos = mats.filter((m) => m.stock < m.minimo);
  el.innerHTML = `
    ${bajos.map((m) => `<div class="alerta ${m.stock <= 0 ? "mal" : ""}">${icon("alerta")} <b>${esc(m.nombre)}</b> está por debajo del mínimo (${cant(m.stock, m.unidad)}; mínimo ${cant(m.minimo, m.unidad)}).</div>`).join("")}
    <div class="grid g4" id="mats">
      ${mats.map((m) => {
        const p = m.capacidad > 0 ? Math.max(0, Math.min(100, (m.stock / m.capacidad) * 100)) : 0;
        const cls = m.stock <= 0 ? "mal" : m.stock < m.minimo ? "warn" : "";
        return `<div class="card mat">
          <span class="muted">${esc(m.nombre)}</span>
          <b class="${cls === "mal" ? "mal-t" : ""}">${cant(m.stock, m.unidad)}</b>
          <div class="nivel"><i class="${cls}" style="width:${p}%"></i></div>
          <small class="muted">${Math.round(p)}% de ${cant(m.capacidad, m.unidad)} · mínimo ${cant(m.minimo, m.unidad)}</small>
          <div class="acciones" style="margin-top:12px">
            <button class="btn btn-primary btn-sm" data-ing="${m.id}">+ Ingreso</button>
            <button class="btn btn-sm" data-aj="${m.id}">Ajustar</button>
            ${ctx.esAdmin ? `<button class="btn btn-ghost btn-sm" data-cfg="${m.id}" title="Capacidad y mínimo">Configurar</button>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>

    <div class="seccion">
      <h2>Últimos movimientos <span class="cnt">· quién cargó cada cosa</span></h2>
      <div class="barra">${campo("Ver", `<select id="filtro-mat">${opciones(mats, "", { vacio: "Todos los materiales" })}</select>`)}</div>
      <div id="movs"></div>
    </div>`;

  const pintarMovs = (lista) => {
    document.getElementById("movs").innerHTML = lista.length
      ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Fecha</th><th>Material</th><th>Tipo</th><th class="num">Cantidad</th><th>Detalle</th><th>Usuario</th></tr></thead>
        <tbody>${lista.map((x) => `<tr>
          <td>${fechaHora(x.creado_en)}</td><td>${esc(x.material_nombre)}</td>
          <td>${badge(...(TIPOS[x.tipo] || [x.tipo]))}</td>
          <td class="num ${x.cantidad < 0 ? "mal-t" : "ok-t"}">${x.cantidad > 0 ? "+" : ""}${n0(x.cantidad)} ${x.unidad}</td>
          <td>${esc(x.nota || "")}</td><td>${esc(x.usuario_nombre || "")}</td></tr>`).join("")}</tbody></table></div>`
      : vacio("Todavía no hay movimientos.");
  };
  pintarMovs(movs);
  document.getElementById("filtro-mat").onchange = async (e) =>
    pintarMovs(await ctx.api.materiales.movimientos({ material: e.target.value || null, limite: 150 }));

  el.querySelector("#mats").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const m = mats.find((x) => x.id === (b.dataset.ing || b.dataset.aj || b.dataset.cfg));
    if (b.dataset.cfg) {
      const ok = await modal({
        title: `Configurar ${m.nombre}`,
        body: `<div class="form-grid">
          ${campo("Nombre", `<input name="nombre" value="${esc(m.nombre)}" required>`, "full")}
          ${campo(`Capacidad (${m.unidad})`, `<input name="capacidad" type="number" min="0" step="any" value="${m.capacidad}">`)}
          ${campo(`Mínimo para alerta (${m.unidad})`, `<input name="minimo" type="number" min="0" step="any" value="${m.minimo}">`)}
        </div>`,
        onOk: async (f) => ctx.api.materiales.guardar(m.id, leerForm(f)),
      });
      if (ok) toast("Guardado.");
      if (ok) ctx.recargar();
      return;
    }
    if (await abrirMovimiento(ctx, m, b.dataset.aj ? "ajuste" : "ingreso")) ctx.recargar();
  });
}
