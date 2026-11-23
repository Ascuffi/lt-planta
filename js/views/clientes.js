import { esc, n1, $, fechaHora, campo, toast, vacio, icon, badgePago, numeroRemito, MEDIOS, fecha } from "../ui.js";
import { formCliente } from "./remitos.js";
import { registrarPago, anularConFirma } from "../pagos.js";

export async function render(el, ctx, { params }) {
  if (params[0]) return cuenta(el, ctx, Number(params[0]));
  const cuentas = await ctx.api.cuentas.list();
  const deudores = cuentas.filter((c) => c.saldo > 0.009);
  el.innerHTML = `
    <div class="barra">
      <button class="btn btn-primary btn-big" id="nuevo">${icon("mas")} Nuevo cliente</button>
      <span class="esp"></span>
      ${campo("Buscar", `<input id="buscar" placeholder="Nombre, CUIT o teléfono">`)}
    </div>
    <div class="grid g3" style="margin-bottom:16px">
      <div class="kpi"><span>Clientes</span><b>${cuentas.filter((c) => c.activo).length}</b></div>
      <div class="kpi"><span>Con saldo a cobrar</span><b>${deudores.length}</b></div>
      <div class="kpi"><span>Total a cobrar</span><b style="font-size:22px">${$(deudores.reduce((s, c) => s + Number(c.saldo), 0))}</b></div>
    </div>
    ${cuentas.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>Cliente</th><th class="solo-escritorio">CUIT / DNI</th><th class="solo-escritorio">Teléfono</th><th class="num">Comprado</th><th class="num">Pagado</th><th class="num">Saldo</th><th></th></tr></thead>
      <tbody id="filas">${cuentas.map((c) => `<tr class="click" data-id="${c.id}" data-q="${esc((c.nombre + " " + (c.cuit || "") + " " + (c.telefono || "")).toLowerCase())}" ${c.activo ? "" : 'style="opacity:.5"'}>
        <td><b>${esc(c.nombre)}</b></td><td class="solo-escritorio">${esc(c.cuit || "")}</td><td class="solo-escritorio">${esc(c.telefono || "")}</td>
        <td class="num">${$(c.total_remitos)}</td><td class="num">${$(c.total_pagos)}</td>
        <td class="num"><b class="${c.saldo > 0.009 ? "mal-t" : ""}">${$(c.saldo)}</b></td>
        <td class="num"><span class="btn btn-sm">Ver cuenta</span></td></tr>`).join("")}</tbody></table></div>` : vacio("Todavía no hay clientes.")}`;

  el.querySelector("#nuevo").onclick = async () => (await formCliente(ctx)) && ctx.recargar();
  el.querySelector("#buscar").oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    el.querySelectorAll("#filas tr").forEach((tr) => (tr.hidden = q && !tr.dataset.q.includes(q)));
  };
  el.querySelector("#filas")?.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) ctx.ir("clientes/" + tr.dataset.id);
  });
}

async function cuenta(el, ctx, id) {
  const [cuentas, det, clientes] = await Promise.all([ctx.api.cuentas.list(), ctx.api.cuentas.detalle(id), ctx.api.clientes.list()]);
  const c = cuentas.find((x) => x.id === id);
  const cli = clientes.find((x) => x.id === id);
  const pv = ctx.cfg.remito_punto_venta;
  // movimientos de cuenta: remitos (debe) y pagos (haber), en orden cronológico con saldo
  const movs = [
    ...det.remitos.filter((r) => r.estado === "emitido").map((r) => ({ f: r.fecha, txt: `Remito ${numeroRemito(r.numero, pv)} · ${r.formula_nombre} ${n1(r.m3)} m³`, debe: Number(r.total), haber: 0, link: `#/remitos/${r.id}` })),
    ...det.pagos.filter((p) => !p.anulado).map((p) => ({ f: p.fecha, txt: `Pago ${MEDIOS[p.medio]}${p.remito_numero ? " · remito " + p.remito_numero : ""}${p.referencia ? " · " + p.referencia : ""} — confirmó ${p.confirmado_por_nombre}`, debe: 0, haber: Number(p.monto) })),
  ].sort((a, b) => a.f.localeCompare(b.f) || b.debe - a.debe);
  let saldo = 0;
  movs.forEach((m) => (m.saldo = saldo += m.debe - m.haber));
  movs.reverse();

  el.innerHTML = `
    <div class="barra">
      <a class="btn btn-ghost" href="#/clientes">← Clientes</a><span class="esp"></span>
      <button class="btn btn-primary btn-big" id="pagar">Registrar pago</button>
      <a class="btn btn-big" href="#/remitos/nuevo">Nuevo remito</a>
      <button class="btn" id="editar">Editar datos</button>
    </div>
    <div class="grid g3">
      <div class="card" style="grid-column:span 1"><h2>${esc(c.nombre)}</h2>
        <p class="muted" style="margin:0">${esc([cli.cuit && "CUIT/DNI " + cli.cuit, cli.telefono, cli.direccion].filter(Boolean).join(" · ") || "Sin datos de contacto")}</p></div>
      <div class="kpi"><span>Comprado</span><b style="font-size:22px">${$(c.total_remitos)}</b><small>Pagado ${$(c.total_pagos)}</small></div>
      <div class="kpi" style="border-left-color:${c.saldo > 0.009 ? "var(--mal)" : "var(--ok)"}"><span>Saldo</span><b style="font-size:22px">${$(c.saldo)}</b><small>${c.saldo > 0.009 ? "a cobrar" : c.saldo < -0.009 ? "a favor del cliente" : "al día"}</small></div>
    </div>

    <div class="seccion"><h2>Remitos <span class="cnt">· ${det.remitos.length}</span></h2>
      ${det.remitos.length ? `<div class="tabla-wrap"><table><thead><tr><th>N°</th><th>Fecha</th><th>Hormigón</th><th class="num">Total</th><th>Pago</th><th></th></tr></thead><tbody>
      ${det.remitos.map((r) => `<tr class="${r.estado}">
        <td><a href="#/remitos/${r.id}"><b>${numeroRemito(r.numero, pv)}</b></a></td><td>${fechaHora(r.fecha)}</td><td>${esc(r.formula_nombre)} · ${n1(r.m3)} m³</td>
        <td class="num">${$(r.total)}</td><td>${badgePago(r.pago_estado, r.medios_pago)}</td>
        <td class="num">${r.estado === "emitido" && ["pendiente", "parcial"].includes(r.pago_estado) ? `<button class="btn btn-sm" data-cobrar="${r.id}">Cobrar</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : vacio("Sin remitos.")}</div>

    <div class="seccion"><h2>Pagos <span class="cnt">· con la firma de quien los cargó</span></h2>
      ${det.pagos.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Medio</th><th>Remito</th><th>Referencia</th><th class="num">Monto</th><th>Confirmó</th><th></th></tr></thead><tbody>
      ${det.pagos.map((p) => `<tr class="${p.anulado ? "anulado" : ""}">
        <td>${fechaHora(p.fecha)}</td><td>${MEDIOS[p.medio]}</td><td>${p.remito_numero ? numeroRemito(p.remito_numero, pv) : "A cuenta"}</td>
        <td>${esc(p.referencia || "")}</td><td class="num"><b>${$(p.monto)}</b></td>
        <td>${icon("candado")} ${esc(p.confirmado_por_nombre)}${p.anulado ? `<br><small>Anuló ${esc(p.anulado_por_nombre || "")}: ${esc(p.motivo_anulacion || "")}</small>` : ""}</td>
        <td class="num">${ctx.esAdmin && !p.anulado ? `<button class="btn btn-ghost btn-sm" data-anular="${p.id}" style="color:var(--mal)">Anular</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : vacio("Sin pagos.")}</div>

    <div class="seccion"><h2>Cuenta corriente</h2>
      ${movs.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Detalle</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead><tbody>
      ${movs.map((m) => `<tr><td>${fecha(m.f)}</td><td>${m.link ? `<a href="${m.link}">${esc(m.txt)}</a>` : esc(m.txt)}</td>
        <td class="num">${m.debe ? $(m.debe) : ""}</td><td class="num">${m.haber ? $(m.haber) : ""}</td><td class="num"><b>${$(m.saldo)}</b></td></tr>`).join("")}
      </tbody></table></div>` : vacio("Sin movimientos.")}</div>`;

  el.querySelector("#pagar").onclick = async () => (await registrarPago(ctx, { cliente_id: id, cliente_nombre: c.nombre, saldo: c.saldo })) && ctx.recargar();
  el.querySelector("#editar").onclick = async () => (await formCliente(ctx, cli)) && ctx.recargar();
  el.addEventListener("click", async (e) => {
    const co = e.target.closest("[data-cobrar]");
    const an = e.target.closest("[data-anular]");
    if (co) {
      const r = det.remitos.find((x) => x.id === Number(co.dataset.cobrar));
      if (await registrarPago(ctx, { cliente_id: id, cliente_nombre: c.nombre, remito: r })) ctx.recargar();
    }
    if (an) {
      const ok = await anularConFirma(ctx, "Anular pago", "El monto vuelve a quedar como deuda del cliente. Queda registrado quién lo anuló y por qué.", (motivo, pass) => ctx.api.pagos.anular(Number(an.dataset.anular), motivo, pass));
      if (ok) ctx.recargar();
    }
  });
}
