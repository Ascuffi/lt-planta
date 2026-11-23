import { esc, n0, n1, $, cant, fechaHora, hoyISO, modal, leerForm, campo, opciones, toast, vacio, icon, badgePago, numeroRemito, requerir, MEDIOS } from "../ui.js";
import { imprimirRemito } from "../print.js";
import { registrarPago, anularConFirma, bloqueMedios, bloqueFirma } from "../pagos.js";

export async function render(el, ctx, { params, query }) {
  if (params[0] === "nuevo") return nuevo(el, ctx, query);
  if (params[0]) return detalle(el, ctx, Number(params[0]), query);
  return lista(el, ctx, query);
}

// ---------------------------------------------------------------- lista
async function lista(el, ctx, query) {
  const hasta = query.get("hasta") || hoyISO();
  const desde = query.get("desde") || new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const cliente = query.get("cliente") || "";
  const [rems, clientes] = await Promise.all([ctx.api.remitos.list({ desde, hasta, cliente }), ctx.api.clientes.list()]);
  const validos = rems.filter((r) => r.estado === "emitido");
  const pv = ctx.cfg.remito_punto_venta;
  el.innerHTML = `
    <div class="barra">
      <a class="btn btn-primary btn-big" href="#/remitos/nuevo">${icon("mas")} Nuevo remito</a>
      <span class="esp"></span>
      ${campo("Desde", `<input type="date" id="desde" value="${desde}">`)}
      ${campo("Hasta", `<input type="date" id="hasta" value="${hasta}">`)}
      ${campo("Cliente", `<select id="cliente">${opciones(clientes, cliente, { vacio: "Todos" })}</select>`)}
    </div>
    <div class="grid g3" style="margin-bottom:16px">
      <div class="kpi"><span>Remitos</span><b>${validos.length}</b></div>
      <div class="kpi"><span>Hormigón despachado</span><b>${n1(validos.reduce((s, r) => s + Number(r.m3), 0))} m³</b></div>
      <div class="kpi"><span>Total vendido</span><b style="font-size:22px">${$(validos.reduce((s, r) => s + Number(r.total), 0))}</b>
        <small>${$(validos.reduce((s, r) => s + Math.max(Number(r.total) - Number(r.pagado), 0), 0))} a cobrar</small></div>
    </div>
    ${rems.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Hormigón</th><th class="num">m³</th><th class="num">Total</th><th>Pago</th><th class="solo-escritorio">Mixer / chofer</th><th></th></tr></thead>
      <tbody>${rems.map((r) => `<tr class="click ${r.estado}" data-id="${r.id}">
        <td><b>${numeroRemito(r.numero, pv)}</b></td><td>${fechaHora(r.fecha)}</td><td>${esc(r.cliente_nombre)}</td>
        <td>${esc(r.formula_nombre)}</td><td class="num">${n1(r.m3)}</td><td class="num">${$(r.total)}</td>
        <td>${badgePago(r.pago_estado, r.medios_pago)}</td>
        <td class="solo-escritorio">${esc(r.vehiculo_dominio || "")} ${r.chofer_nombre ? "· " + esc(r.chofer_nombre) : ""}</td>
        <td class="num"><button class="btn btn-sm" data-print="${r.id}" title="Imprimir">${icon("print")}</button></td></tr>`).join("")}
      </tbody></table></div>` : vacio("No hay remitos en estas fechas.")}`;

  const filtrar = () => {
    const q = new URLSearchParams({ desde: el.querySelector("#desde").value, hasta: el.querySelector("#hasta").value });
    if (el.querySelector("#cliente").value) q.set("cliente", el.querySelector("#cliente").value);
    location.hash = "#/remitos?" + q;
  };
  el.querySelectorAll("#desde,#hasta,#cliente").forEach((i) => (i.onchange = filtrar));
  el.querySelector("tbody")?.addEventListener("click", (e) => {
    const p = e.target.closest("[data-print]");
    if (p) {
      e.stopPropagation();
      return imprimirRemito(rems.find((r) => r.id === Number(p.dataset.print)), ctx.cfg);
    }
    const tr = e.target.closest("tr[data-id]");
    if (tr) ctx.ir("remitos/" + tr.dataset.id);
  });
}

// ---------------------------------------------------------------- nuevo
async function nuevo(el, ctx, query) {
  const [clientes, formulas, mats, vehs, personal, peds] = await Promise.all([
    ctx.api.clientes.list(),
    ctx.api.formulas.list(),
    ctx.api.materiales.list(),
    ctx.api.vehiculos.list(),
    ctx.api.personal.list(),
    ctx.api.pedidos.list({ estado: "pendiente" }),
  ]);
  const forms = formulas.filter((f) => f.activa);
  const silos = mats.filter((m) => m.tipo === "cemento");
  const mixers = vehs.filter((v) => v.activo && v.tipo === "mixer" && v.estado !== "taller");
  const bombas = vehs.filter((v) => v.activo && v.tipo === "bomba" && v.estado !== "taller");
  const choferes = personal.filter((p) => p.activo && p.funcion !== "operador");
  const ped = peds.find((p) => p.id === Number(query.get("pedido")));
  const siloMayor = [...silos].sort((a, b) => b.stock - a.stock)[0];
  const mixerLibre = mixers.find((v) => v.estado === "disponible");
  let clientesAct = clientes.filter((c) => c.activo);

  el.innerHTML = `
    <form class="nuevo-remito" id="f" novalidate>
      ${ped ? `<div class="alerta" style="border-color:var(--amarillo);color:var(--amarillo)">${icon("pedido")} Pedido N° ${ped.id}: ${esc(ped.cliente_nombre)} · ${esc(ped.formula_nombre)} · faltan ${n1(ped.m3_pendientes)} de ${n1(ped.m3)} m³</div>` : ""}
      <div class="grid g2">
        <div class="card paso">
          <h3>Cliente y obra</h3>
          <div class="form-grid">
            <div class="full" style="display:flex;gap:8px;align-items:end">
              ${campo("Cliente", `<select name="cliente_id" id="cliente" required>${opciones(clientesAct, ped?.cliente_id, { vacio: "— Elegí el cliente —" })}</select>`, "full")}
              <button type="button" class="btn" id="nuevo-cliente" title="Agregar cliente">${icon("mas")}</button>
            </div>
            ${campo("Dirección de la obra / entrega", `<input name="obra_direccion" value="${esc(ped?.obra_direccion || "")}" placeholder="Calle, número, barrio o ruta km">`, "full")}
          </div>
        </div>
        <div class="card paso">
          <h3>Hormigón</h3>
          <div class="form-grid">
            ${campo("Tipo", `<select name="formula_id" id="formula" required>${opciones(forms, ped?.formula_id, { vacio: "— Elegí —" })}</select>`)}
            ${campo("Cantidad (m³)", `<input name="m3" id="m3" type="number" min="0.5" max="20" step="0.5" inputmode="decimal" required value="${ped ? Math.min(ped.m3_pendientes, mixerLibre?.capacidad_m3 || 8) : ""}">`)}
            ${campo("Cemento sale del", `<select name="silo_id" id="silo">${opciones(silos, siloMayor?.id, { txt: (s) => `${s.nombre} (${cant(s.stock, "kg")})` })}</select>`)}
            ${campo("Precio por m³ ($)", `<input name="precio_m3" id="precio" type="number" min="0" step="0.01" ${ctx.esAdmin ? "" : "readonly title='Solo el administrador cambia precios (en Fórmulas y precios)'"}>`)}
          </div>
        </div>
      </div>
      <div class="card paso">
        <h3>Transporte</h3>
        <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${campo("Mixer", `<select name="vehiculo_id" id="mixer">${opciones(mixers, mixerLibre?.id, { vacio: "— Sin mixer (retira el cliente) —", txt: (v) => `${v.dominio || "s/d"} · ${v.denominacion}${v.capacidad_m3 ? " " + v.capacidad_m3 + " m³" : ""}${v.estado === "en_viaje" ? " (en viaje)" : ""}` })}</select>`)}
          ${campo("Chofer", `<select name="chofer_id" id="chofer">${opciones(choferes, mixerLibre?.personal_id, { vacio: "— Elegí —" })}</select>`)}
          ${campo("Bomba", `<select name="bomba_id">${opciones(bombas, "", { vacio: ped?.requiere_bomba ? "— ¡El pedido pide bomba! —" : "No lleva bomba", txt: (v) => v.denominacion })}</select>`)}
          ${campo("Observaciones (salen impresas)", `<input name="nota" value="${esc(ped?.nota || "")}">`, "full")}
        </div>
      </div>
      <div class="card paso">
        <h3>Consumo de materiales (se descuenta del stock)</h3>
        <div class="consumo" id="consumo"></div>
      </div>
      <div class="card paso">
        <h3>Pago</h3>
        <div class="grid g2" style="align-items:start">
          <div>${bloqueMedios("", true)}
            <div id="pago-extra" hidden style="margin-top:12px">
              ${campo("Referencia (opcional)", `<input name="referencia" placeholder="N° de operación o boleta">`)}
              ${bloqueFirma(ctx)}
            </div>
          </div>
          <div style="text-align:right">
            <div class="muted">Total del remito</div>
            <div class="total-grande" id="total">$ 0,00</div>
            <div class="muted" id="detalle-total"></div>
          </div>
        </div>
      </div>
      <p class="form-error" id="err" hidden style="margin:0"></p>
      <div class="acciones" style="justify-content:flex-end">
        <a class="btn btn-ghost btn-big" href="#/remitos">Cancelar</a>
        <button class="btn btn-primary btn-big" type="submit" id="emitir">${icon("remito")} Emitir remito e imprimir</button>
      </div>
    </form>`;

  const f = el.querySelector("#f");
  const matPor = Object.fromEntries(mats.map((m) => [m.id, m]));
  let precioManual = false;
  const actualizar = () => {
    const form = forms.find((x) => x.id === Number(f.formula_id.value));
    if (form && !precioManual) f.precio_m3.value = form.precio_m3 || 0;
    const m3 = Number(f.m3.value) || 0;
    const precio = Number(f.precio_m3.value) || 0;
    const silo = f.silo_id.value;
    const items = form
      ? [
          [silo, "Cemento", form.cemento_kg * m3, "kg"],
          ["piedra620", "Piedra 6/20", form.piedra620_kg * m3, "kg"],
          ["piedra06", "Piedra 0/6", form.piedra06_kg * m3, "kg"],
          ["arena", "Arena", form.arena_kg * m3, "kg"],
          ["agua", "Agua", form.agua_l * m3, "L"],
        ]
      : [];
    el.querySelector("#consumo").innerHTML = items.length
      ? items.map(([id, t, q, u]) => {
          const falta = matPor[id] && q > matPor[id].stock;
          return `<div class="${falta ? "falta" : ""}"><small>${t}</small><b>${n0(q)} ${u}</b>${falta ? `<small class="mal-t">hay ${n0(matPor[id].stock)} ${u}</small>` : ""}</div>`;
        }).join("")
      : `<span class="muted">Elegí el tipo de hormigón y los m³.</span>`;
    el.querySelector("#total").textContent = $(m3 * precio);
    el.querySelector("#detalle-total").textContent = form && m3 ? `${n1(m3)} m³ × ${$(precio)}` : "";
    const mx = mixers.find((v) => v.id === Number(f.vehiculo_id.value));
    el.querySelector("#m3").title = mx?.capacidad_m3 ? `Capacidad del mixer: ${mx.capacidad_m3} m³` : "";
  };
  f.addEventListener("input", (e) => {
    if (e.target === f.precio_m3) precioManual = true;
    if (e.target === f.formula_id) precioManual = false;
    actualizar();
  });
  f.vehiculo_id.addEventListener("change", () => {
    const mx = mixers.find((v) => v.id === Number(f.vehiculo_id.value));
    if (mx?.personal_id && choferes.some((c) => c.id === mx.personal_id)) f.chofer_id.value = mx.personal_id;
  });
  f.addEventListener("change", (e) => {
    if (e.target.name === "medio") el.querySelector("#pago-extra").hidden = !e.target.value;
  });
  actualizar();

  el.querySelector("#nuevo-cliente").onclick = async () => {
    const c = await formCliente(ctx);
    if (c) {
      clientesAct = [...clientesAct, c].sort((a, b) => a.nombre.localeCompare(b.nombre));
      f.cliente_id.innerHTML = opciones(clientesAct, c.id, { vacio: "— Elegí el cliente —" });
    }
  };

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = el.querySelector("#err");
    err.hidden = true;
    const btn = el.querySelector("#emitir");
    try {
      const o = leerForm(f);
      requerir(o, { cliente_id: "el cliente", formula_id: "el tipo de hormigón", m3: "los m³" });
      if (!(o.m3 > 0)) throw new Error("Indicá los m³.");
      const medio = f.querySelector("input[name=medio]:checked")?.value || "";
      if (medio && !f.password.value) throw new Error("Para registrar el pago escribí tu contraseña (o elegí «A cuenta»).");
      const mx = mixers.find((v) => v.id === Number(o.vehiculo_id));
      if (mx?.capacidad_m3 && o.m3 > mx.capacidad_m3) {
        const seguir = await modal({ title: "Revisá la cantidad", body: `<p>El mixer ${esc(mx.dominio || "")} carga ${mx.capacidad_m3} m³ y pusiste ${o.m3} m³. ¿Emitir igual?</p>`, okText: "Emitir igual" });
        if (!seguir) return;
      }
      const p = {
        cliente_id: Number(o.cliente_id),
        formula_id: Number(o.formula_id),
        m3: o.m3,
        silo_id: o.silo_id,
        precio_m3: o.precio_m3 ?? 0,
        obra_direccion: o.obra_direccion,
        vehiculo_id: o.vehiculo_id ? Number(o.vehiculo_id) : null,
        chofer_id: o.chofer_id ? Number(o.chofer_id) : null,
        bomba_id: o.bomba_id ? Number(o.bomba_id) : null,
        nota: o.nota,
        pedido_id: ped ? ped.id : null,
      };
      if (medio) p.pago = { medio, referencia: o.referencia, password: f.password.value };
      btn.disabled = true;
      btn.textContent = "Emitiendo…";
      const r = await ctx.api.remitos.emitir(p);
      toast(`Remito N° ${r.numero} emitido.`);
      ctx.ir(`remitos/${r.id}?imprimir=1`);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      err.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      if (btn.isConnected) {
        btn.disabled = false;
        btn.innerHTML = `${icon("remito")} Emitir remito e imprimir`;
      }
    }
  });
}

export async function formCliente(ctx, c = {}) {
  return modal({
    title: c.id ? "Editar cliente" : "Nuevo cliente",
    body: `<div class="form-grid">
      ${campo("Nombre o razón social", `<input name="nombre" required value="${esc(c.nombre)}">`, "full")}
      ${campo("CUIT / DNI", `<input name="cuit" value="${esc(c.cuit)}">`)}
      ${campo("Teléfono", `<input name="telefono" type="tel" value="${esc(c.telefono)}">`)}
      ${campo("Dirección", `<input name="direccion" value="${esc(c.direccion)}">`, "full")}
      ${campo("Nota", `<input name="nota" value="${esc(c.nota)}">`, "full")}
      ${c.id ? `<label class="check full"><input type="checkbox" name="activo" ${c.activo !== false ? "checked" : ""}> Cliente activo</label>` : ""}
    </div>`,
    onOk: async (f) => {
      const o = leerForm(f);
      requerir(o, { nombre: "el nombre" });
      if (c.id) o.id = c.id;
      const r = await ctx.api.clientes.guardar(o);
      toast("Cliente guardado.");
      return r;
    },
  });
}

// ---------------------------------------------------------------- detalle
async function detalle(el, ctx, id, query) {
  const r = await ctx.api.remitos.get(id);
  const { pagos } = await ctx.api.cuentas.detalle(r.cliente_id);
  const pagosRem = pagos.filter((p) => p.remito_id === r.id);
  const nro = numeroRemito(r.numero, ctx.cfg.remito_punto_venta);
  const consumo = Object.entries(r.consumo || {});
  const nombres = { silo1: "Silo 1", silo2: "Silo 2", silo3: "Silo 3", arena: "Arena", piedra620: "Piedra 6/20", piedra06: "Piedra 0/6", agua: "Agua" };
  el.innerHTML = `
    <div class="barra">
      <a class="btn btn-ghost" href="#/remitos">← Remitos</a><span class="esp"></span>
      <button class="btn btn-primary btn-big" id="imprimir">${icon("print")} Imprimir 3 copias</button>
      ${r.estado === "emitido" && ["pendiente", "parcial"].includes(r.pago_estado) ? `<button class="btn btn-big" id="cobrar">Registrar pago</button>` : ""}
      ${ctx.esAdmin && r.estado === "emitido" ? `<button class="btn btn-ghost" id="anular" style="color:var(--mal)">Anular</button>` : ""}
    </div>
    ${r.estado === "anulado" ? `<div class="alerta mal">${icon("alerta")} Remito ANULADO · ${esc(r.motivo_anulacion || "")}. El stock fue devuelto.</div>` : ""}
    <div class="grid g2">
      <div class="card">
        <h2>Remito N° ${nro}</h2>
        <table><tbody>
          <tr><td class="muted">Fecha</td><td>${fechaHora(r.fecha)}</td></tr>
          <tr><td class="muted">Cliente</td><td><a href="#/clientes/${r.cliente_id}"><b>${esc(r.cliente_nombre)}</b></a></td></tr>
          <tr><td class="muted">Obra</td><td>${esc(r.obra_direccion || "—")}</td></tr>
          <tr><td class="muted">Hormigón</td><td><b>${esc(r.formula_nombre)} · ${n1(r.m3)} m³</b></td></tr>
          <tr><td class="muted">Precio</td><td>${$(r.precio_m3)} por m³</td></tr>
          <tr><td class="muted">Total</td><td><b style="font-size:20px">${$(r.total)}</b></td></tr>
          <tr><td class="muted">Mixer / chofer</td><td>${esc([r.vehiculo_dominio, r.vehiculo_nombre].filter(Boolean).join(" · ") || "—")} · ${esc(r.chofer_nombre || "—")}</td></tr>
          <tr><td class="muted">Bomba</td><td>${esc(r.bomba_nombre || "No")}</td></tr>
          <tr><td class="muted">Emitido por</td><td>${esc(r.creado_por_nombre || "")}</td></tr>
          ${r.nota ? `<tr><td class="muted">Observaciones</td><td>${esc(r.nota)}</td></tr>` : ""}
        </tbody></table>
      </div>
      <div class="grid" style="align-content:start">
        <div class="card">
          <h2>Pago ${badgePago(r.pago_estado, r.medios_pago)}</h2>
          ${pagosRem.length ? `<table><tbody>${pagosRem.map((p) => `<tr class="${p.anulado ? "anulado" : ""}">
            <td>${fechaHora(p.fecha)}</td><td>${MEDIOS[p.medio]}</td><td class="num">${$(p.monto)}</td>
            <td class="muted">${icon("candado")} ${esc(p.confirmado_por_nombre)}${p.referencia ? " · " + esc(p.referencia) : ""}</td></tr>`).join("")}</tbody></table>`
            : `<p class="muted">${r.pago_estado === "sin precio" ? "El remito no tiene precio." : "Sin pagos: queda en la cuenta corriente del cliente."}</p>`}
        </div>
        <div class="card">
          <h2>Materiales descontados</h2>
          <div class="consumo" style="grid-template-columns:repeat(3,minmax(0,1fr))">
            ${consumo.map(([k, v]) => `<div><small>${nombres[k] || k}</small><b>${n0(v)} ${k === "agua" ? "L" : "kg"}</b></div>`).join("")}
          </div>
        </div>
      </div>
    </div>`;

  el.querySelector("#imprimir").onclick = () => imprimirRemito(r, ctx.cfg);
  el.querySelector("#cobrar")?.addEventListener("click", async () => {
    if (await registrarPago(ctx, { cliente_id: r.cliente_id, cliente_nombre: r.cliente_nombre, remito: r })) ctx.recargar();
  });
  el.querySelector("#anular")?.addEventListener("click", async () => {
    const ok = await anularConFirma(ctx, `Anular remito N° ${nro}`, "Se devuelven al stock los materiales y se descuenta de la cuenta del cliente. No se puede deshacer.", (motivo, pass) => ctx.api.remitos.anular(r.id, motivo, pass));
    if (ok) ctx.recargar();
  });
  if (query.get("imprimir")) {
    history.replaceState(null, "", `#/remitos/${r.id}`);
    imprimirRemito(r, ctx.cfg);
  }
}
