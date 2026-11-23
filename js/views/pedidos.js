import { esc, n1, fecha, hoyISO, modal, leerForm, campo, opciones, toast, vacio, icon, badge, requerir } from "../ui.js";
import { formCliente } from "./remitos.js";

const EST = { pendiente: ["Pendiente", "warn"], completo: ["Entregado", "ok"], cancelado: ["Cancelado", "muted"] };

async function formPedido(ctx, p = {}) {
  const [clientes, formulas] = await Promise.all([ctx.api.clientes.list(), ctx.api.formulas.list()]);
  let cls = clientes.filter((c) => c.activo);
  const promesa = modal({
    title: p.id ? `Pedido N° ${p.id}` : "Nuevo pedido",
    wide: true,
    body: `<div class="form-grid">
      <div class="full" style="display:flex;gap:8px;align-items:end">
        ${campo("Cliente", `<select name="cliente_id" required>${opciones(cls, p.cliente_id, { vacio: "— Elegí —" })}</select>`, "full")}
        <button type="button" class="btn" data-nc title="Nuevo cliente">${icon("mas")}</button>
      </div>
      ${campo("Obra / dirección de entrega", `<input name="obra_direccion" value="${esc(p.obra_direccion)}">`, "full")}
      ${campo("Hormigón", `<select name="formula_id" required>${opciones(formulas.filter((f) => f.activa), p.formula_id, { vacio: "— Elegí —" })}</select>`)}
      ${campo("Cantidad total (m³)", `<input name="m3" type="number" min="0.5" step="0.5" required value="${p.m3 ?? ""}">`)}
      ${campo("Fecha de entrega", `<input name="fecha_entrega" type="date" required value="${p.fecha_entrega || hoyISO()}">`)}
      ${campo("Hora", `<input name="hora" type="time" value="${esc(p.hora)}">`)}
      <label class="check full"><input type="checkbox" name="requiere_bomba" ${p.requiere_bomba ? "checked" : ""}> Necesita bomba</label>
      ${campo("Nota", `<input name="nota" value="${esc(p.nota)}">`, "full")}
    </div>`,
    onOk: async (f) => {
      const o = leerForm(f);
      requerir(o, { cliente_id: "el cliente", formula_id: "el hormigón", m3: "los m³", fecha_entrega: "la fecha" });
      o.cliente_id = Number(o.cliente_id);
      o.formula_id = Number(o.formula_id);
      if (p.id) o.id = p.id;
      await ctx.api.pedidos.guardar(o);
    },
  });
  const bg = [...document.querySelectorAll(".modal-bg")].pop();
  bg.querySelector("[data-nc]").onclick = async () => {
    const c = await formCliente(ctx);
    if (c) {
      cls = [...cls, c].sort((a, b) => a.nombre.localeCompare(b.nombre));
      bg.querySelector("[name=cliente_id]").innerHTML = opciones(cls, c.id, { vacio: "— Elegí —" });
    }
  };
  const ok = await promesa;
  if (ok) toast("Pedido guardado.");
  return ok;
}

export async function render(el, ctx, { query }) {
  const ver = query.get("ver") || "pendiente";
  const peds = await ctx.api.pedidos.list(ver === "todos" ? { desde: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) } : { estado: "pendiente" });
  const hoy = hoyISO();
  el.innerHTML = `
    <div class="barra">
      <button class="btn btn-primary btn-big" id="nuevo">${icon("mas")} Nuevo pedido</button>
      <span class="esp"></span>
      ${campo("Mostrar", `<select id="ver"><option value="pendiente">Pendientes</option><option value="todos" ${ver === "todos" ? "selected" : ""}>Todos (últimos 30 días)</option></select>`)}
    </div>
    <p class="muted" style="margin-top:0">Un pedido es lo que pidió el cliente. Se entrega con uno o varios remitos (uno por viaje de mixer). Cuando se completan los m³, pasa a «Entregado».</p>
    ${peds.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>N°</th><th>Entrega</th><th>Cliente</th><th>Obra</th><th>Hormigón</th><th class="num">Entregado</th><th>Estado</th><th></th></tr></thead>
      <tbody>${peds.map((p) => `<tr>
        <td>${p.id}</td>
        <td>${fecha(p.fecha_entrega + "T12:00")} ${esc(p.hora || "")} ${p.estado === "pendiente" && p.fecha_entrega < hoy ? badge("atrasado", "mal") : p.fecha_entrega === hoy ? badge("hoy", "info") : ""}</td>
        <td><b>${esc(p.cliente_nombre)}</b></td>
        <td>${esc(p.obra_direccion || "")} ${p.requiere_bomba ? badge("bomba", "info") : ""}</td>
        <td>${esc(p.formula_nombre)}</td>
        <td class="num">${n1(p.m3_entregados)} / ${n1(p.m3)} m³</td>
        <td>${badge(...EST[p.estado])}</td>
        <td class="num" style="white-space:nowrap">
          ${p.estado === "pendiente" ? `<a class="btn btn-primary btn-sm" href="#/remitos/nuevo?pedido=${p.id}">Emitir remito</a>
          <button class="btn btn-sm" data-edit="${p.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" data-cancel="${p.id}">Cancelar</button>` : ""}
        </td></tr>`).join("")}</tbody></table></div>` : vacio("No hay pedidos pendientes.")}`;

  el.querySelector("#ver").onchange = (e) => (location.hash = "#/pedidos?ver=" + e.target.value);
  el.querySelector("#nuevo").onclick = async () => (await formPedido(ctx)) && ctx.recargar();
  el.addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-edit]");
    const ca = e.target.closest("[data-cancel]");
    if (ed) {
      const p = peds.find((x) => x.id === Number(ed.dataset.edit));
      const base = Object.fromEntries(["id", "cliente_id", "obra_direccion", "formula_id", "m3", "fecha_entrega", "hora", "requiere_bomba", "nota"].map((k) => [k, p[k]]));
      if (await formPedido(ctx, base)) ctx.recargar();
    }
    if (ca) {
      const ok = await modal({ title: "Cancelar pedido", body: "<p>¿Cancelar este pedido? Los remitos ya emitidos no se modifican.</p>", okText: "Cancelar pedido", cancelText: "Volver", danger: true });
      if (ok) {
        await ctx.api.pedidos.guardar({ id: Number(ca.dataset.cancel), estado: "cancelado" });
        toast("Pedido cancelado.");
        ctx.recargar();
      }
    }
  });
}
