import { esc, n1, $, icon, esHoy, hoyISO, vacio, cant } from "../ui.js";
import { svgPlanta } from "../dibujos.js";
import { abrirMovimiento } from "./stock.js";
import { tarjetaVehiculo, cambiarEstado } from "./flota.js";

export async function render(el, ctx) {
  const hoy = hoyISO();
  const [mats, vehs, personal, rems, peds] = await Promise.all([
    ctx.api.materiales.list(),
    ctx.api.vehiculos.list(),
    ctx.api.personal.list(),
    ctx.api.remitos.list({ desde: hoy, hasta: hoy }),
    ctx.api.pedidos.list({ estado: "pendiente" }),
  ]);
  const remHoy = rems.filter((r) => r.estado === "emitido" && esHoy(r.fecha));
  const m3Hoy = remHoy.reduce((s, r) => s + Number(r.m3), 0);
  const cobradoHoy = remHoy.filter((r) => r.pago_estado === "pagado").reduce((s, r) => s + Number(r.total), 0);
  const pedHoy = peds.filter((p) => p.fecha_entrega <= hoy);
  const activos = vehs.filter((v) => v.activo);
  const mixers = activos.filter((v) => v.grupo === "hormigon");
  const equipos = activos.filter((v) => v.grupo === "suelos");
  const enPlanta = mixers.filter((v) => v.tipo === "mixer" && v.estado === "disponible").length;
  const bajos = mats.filter((m) => m.stock < m.minimo);

  el.innerHTML = `
    <div class="barra">
      <a class="btn btn-primary btn-big" href="#/remitos/nuevo">${icon("remito")} Nuevo remito</a>
      <a class="btn btn-big" href="#/pedidos">${icon("pedido")} Pedidos</a>
      <span class="esp"></span>
    </div>
    ${bajos.length > 2
      ? `<div class="alerta ${bajos.some((m) => m.stock <= 0) ? "mal" : ""}">${icon("alerta")} <span><b>Stock bajo en ${bajos.length} depósitos:</b> ${bajos.map((m) => esc(m.nombre.replace("Silo de cemento", "Silo"))).join(", ")}. ${bajos.every((m) => m.stock <= 0) ? "Si recién empiezan, cargá el nivel real de cada uno en <a href='#/stock'>Stock → Ajustar</a>." : "Tocá cada uno en el dibujo para cargar un ingreso."}</span></div>`
      : bajos.map((m) => `<div class="alerta ${m.stock <= 0 ? "mal" : ""}">${icon("alerta")} <b>${esc(m.nombre)}</b> bajo el mínimo: ${cant(m.stock, m.unidad)}. Tocá el ${m.tipo === "arido" ? "acopio" : m.tipo === "agua" ? "tanque" : "silo"} para cargar un ingreso.</div>`).join("")}
    <div class="grid g4">
      <div class="kpi"><span>Remitos de hoy</span><b>${remHoy.length}</b><small>${n1(m3Hoy)} m³ despachados</small></div>
      <div class="kpi"><span>Pedidos para hoy</span><b>${pedHoy.length}</b><small>${n1(pedHoy.reduce((s, p) => s + Number(p.m3_pendientes), 0))} m³ por entregar</small></div>
      <div class="kpi"><span>Mixers en planta</span><b>${enPlanta} <small>/ ${mixers.filter((v) => v.tipo === "mixer").length}</small></b><small>${mixers.filter((v) => v.estado === "en_viaje").length} en viaje</small></div>
      <div class="kpi"><span>Cobrado hoy</span><b style="font-size:22px">${$(cobradoHoy)}</b><small>${remHoy.filter((r) => r.pago_estado === "pendiente").length} remitos a cobrar</small></div>
    </div>

    <div class="seccion">
      <h2>Estado de planta <span class="cnt">· tocá un silo, el tanque o un acopio para cargar ingreso o corregir nivel</span></h2>
      <div class="card planta-card">${svgPlanta(mats)}</div>
    </div>

    <div class="seccion">
      <h2>Pedidos para hoy <span class="cnt">· ${pedHoy.length}</span></h2>
      ${pedHoy.length ? `<div class="tabla-wrap"><table><thead><tr><th>Hora</th><th>Cliente</th><th>Obra</th><th>Hormigón</th><th class="num">Pendiente</th><th></th></tr></thead><tbody>
        ${pedHoy.map((p) => `<tr>
          <td>${esc(p.hora || "—")}${p.fecha_entrega < hoy ? ` <span class="badge warn">atrasado</span>` : ""}</td>
          <td><b>${esc(p.cliente_nombre)}</b></td><td>${esc(p.obra_direccion || "")}${p.requiere_bomba ? ` <span class="badge info">bomba</span>` : ""}</td>
          <td>${esc(p.formula_nombre)}</td>
          <td class="num"><b>${n1(p.m3_pendientes)}</b> de ${n1(p.m3)} m³</td>
          <td class="num"><a class="btn btn-primary btn-sm" href="#/remitos/nuevo?pedido=${p.id}">Emitir remito</a></td></tr>`).join("")}
      </tbody></table></div>` : vacio("No hay pedidos pendientes para hoy.")}
    </div>

    <div class="seccion">
      <h2>Flota de hormigón <span class="cnt">· mixers, bombas y tolva</span></h2>
      <div class="flota-grid" data-grupo>${mixers.map((v) => tarjetaVehiculo(v, personal)).join("")}</div>
    </div>

    <div class="seccion">
      <h2>Equipos de movimiento de suelos <span class="cnt">· con su operador</span></h2>
      <div class="flota-grid" data-grupo>${equipos.map((v) => tarjetaVehiculo(v, personal)).join("")}</div>
    </div>`;

  el.querySelector(".planta-svg").addEventListener("click", async (e) => {
    const g = e.target.closest("[data-mat]");
    if (!g) return;
    const m = mats.find((x) => x.id === g.dataset.mat);
    if (await abrirMovimiento(ctx, m)) ctx.recargar();
  });
  el.querySelector(".planta-svg").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-mat]")) {
      e.preventDefault();
      e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-veh]");
    if (!b) return;
    const v = vehs.find((x) => x.id === Number(b.dataset.veh));
    if (await cambiarEstado(ctx, v, personal)) ctx.recargar();
  });
}
