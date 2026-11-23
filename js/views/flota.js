import { esc, modal, leerForm, campo, opciones, toast, badge, ESTADOS_VEHICULO, requerir, fecha, icon } from "../ui.js";
import { svgVehiculo } from "../dibujos.js";

export const GRUPOS = { hormigon: "Hormigón", suelos: "Movimiento de suelos", aridos: "Transporte de áridos" };
const TIPOS = { mixer: "Mixer", bomba: "Bomba", tolva: "Tolva", equipo: "Equipo vial", camion: "Camión", tractor: "Tractor", semirremolque: "Semirremolque", otro: "Otro" };
const BADGE = { disponible: "ok", en_viaje: "info", trabajando: "info", taller: "mal" };

export const nombreVeh = (v) => `${v.denominacion}${v.dominio ? " · " + v.dominio : ""}`;

export function tarjetaVehiculo(v, personal) {
  const p = personal.find((x) => x.id === v.personal_id);
  return `<button class="unidad ${v.estado}" data-veh="${v.id}" type="button">
    ${badge(ESTADOS_VEHICULO[v.estado] || v.estado, BADGE[v.estado])}
    ${svgVehiculo(v)}
    <b>${esc(v.denominacion)}</b>
    <small class="muted">${esc([v.marca, v.modelo].filter(Boolean).join(" "))}${v.capacidad ? " · " + esc(v.capacidad) : ""}</small><br>
    ${v.dominio ? `<span class="dom">${esc(v.dominio)}</span>` : `<small class="muted">Sin dominio</small>`}
    <div class="op">${icon("personal")} ${p ? esc(p.nombre) : `<span class="muted">Sin asignar</span>`}</div>
  </button>`;
}

/** Cambiar estado / asignar chofer-operador. Devuelve true si cambió. */
export async function cambiarEstado(ctx, v, personal) {
  let irAEditar = false;
  const promesa = modal({
    title: nombreVeh(v),
    body: `
      <div class="medios" style="margin-bottom:14px">
        ${Object.entries(ESTADOS_VEHICULO).map(([k, t]) => `<label><input type="radio" name="estado" value="${k}" ${v.estado === k ? "checked" : ""}>${t}</label>`).join("")}
      </div>
      ${campo(v.grupo === "suelos" ? "Operador asignado" : "Chofer asignado",
        `<select name="personal_id">${opciones(personal.filter((p) => p.activo), v.personal_id, { vacio: "— Sin asignar —" })}</select>`)}
      ${ctx.esAdmin ? `<p style="margin-top:14px"><button type="button" class="btn btn-ghost btn-sm" data-editar>Editar datos del vehículo</button></p>` : ""}`,
    onOk: async (f) => {
      const estado = f.querySelector("input[name=estado]:checked")?.value;
      const pid = f.personal_id.value ? Number(f.personal_id.value) : null;
      await ctx.api.vehiculos.estado(v.id, estado, pid);
    },
  });
  const bg = [...document.querySelectorAll(".modal-bg")].pop();
  bg?.querySelector("[data-editar]")?.addEventListener("click", () => {
    irAEditar = true;
    bg.querySelector(".x").click();
  });
  const ok = await promesa;
  if (irAEditar) return editarVehiculo(ctx, v);
  if (ok) toast("Actualizado.");
  return !!ok;
}

async function editarVehiculo(ctx, v = {}) {
  const ok = await modal({
    title: v.id ? "Editar vehículo" : "Agregar vehículo",
    wide: true,
    body: `<div class="form-grid">
      ${campo("Grupo", `<select name="grupo">${Object.entries(GRUPOS).map(([k, t]) => `<option value="${k}" ${v.grupo === k ? "selected" : ""}>${t}</option>`).join("")}</select>`)}
      ${campo("Tipo", `<select name="tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${v.tipo === k ? "selected" : ""}>${t}</option>`).join("")}</select>`)}
      ${campo("Denominación", `<input name="denominacion" value="${esc(v.denominacion)}" required placeholder="Ej: Camión mixer">`, "full")}
      ${campo("Marca", `<input name="marca" value="${esc(v.marca)}">`)}
      ${campo("Modelo", `<input name="modelo" value="${esc(v.modelo)}">`)}
      ${campo("Año", `<input name="anio" type="number" min="1950" max="2100" value="${v.anio ?? ""}">`)}
      ${campo("Dominio / patente", `<input name="dominio" value="${esc(v.dominio)}" style="text-transform:uppercase">`)}
      ${campo("Capacidad de carga (m³, solo mixers)", `<input name="capacidad_m3" type="number" min="0" step="0.5" value="${v.capacidad_m3 ?? ""}">`)}
      ${campo("Capacidad (texto)", `<input name="capacidad" value="${esc(v.capacidad)}" placeholder="Ej: 30 t">`)}
      ${campo("Vencimiento revisión técnica / VTV", `<input name="venc_revision" type="date" value="${v.venc_revision ?? ""}">`)}
      ${campo("Orden en pantalla", `<input name="orden" type="number" value="${v.orden ?? 99}">`)}
      ${campo("Nota", `<input name="nota" value="${esc(v.nota)}">`, "full")}
      ${v.id ? `<label class="check full"><input type="checkbox" name="activo" ${v.activo !== false ? "checked" : ""}> Activo (destildar si se vendió o dio de baja)</label>` : ""}
    </div>`,
    onOk: async (f) => {
      const o = leerForm(f);
      requerir(o, { denominacion: "denominación" });
      if (o.dominio) o.dominio = o.dominio.toUpperCase().replace(/\s+/g, "");
      if (v.id) o.id = v.id;
      await ctx.api.vehiculos.guardar(o);
    },
  });
  if (ok) toast("Vehículo guardado.");
  return !!ok;
}

export async function render(el, ctx) {
  const [vehs, personal] = await Promise.all([ctx.api.vehiculos.list(), ctx.api.personal.list()]);
  const activos = vehs.filter((v) => v.activo);
  const bajas = vehs.filter((v) => !v.activo);
  const hoy = new Date();
  const vencidos = activos.filter((v) => v.venc_revision && new Date(v.venc_revision) < new Date(hoy.getTime() + 30 * 864e5));
  el.innerHTML = `
    <div class="barra"><p class="muted" style="margin:0">Tocá una unidad para cambiar su estado o asignar chofer/operador.</p><span class="esp"></span>
      ${ctx.esAdmin ? `<button class="btn btn-primary" id="nuevo">${icon("mas")} Agregar vehículo</button>` : ""}</div>
    ${vencidos.map((v) => `<div class="alerta">${icon("alerta")} ${esc(nombreVeh(v))}: revisión técnica ${new Date(v.venc_revision) < hoy ? "VENCIDA" : "vence"} el ${fecha(v.venc_revision + "T12:00")}</div>`).join("")}
    ${Object.entries(GRUPOS).map(([g, t]) => {
      const lista = activos.filter((v) => v.grupo === g);
      return `<div class="seccion"><h2>${t} <span class="cnt">· ${lista.length} unidades</span></h2>
        <div class="flota-grid">${lista.map((v) => tarjetaVehiculo(v, personal)).join("")}</div></div>`;
    }).join("")}
    ${bajas.length && ctx.esAdmin ? `<div class="seccion"><h2>Dados de baja</h2><div class="flota-grid">${bajas.map((v) => tarjetaVehiculo(v, personal)).join("")}</div></div>` : ""}`;

  el.querySelector("#nuevo")?.addEventListener("click", async () => (await editarVehiculo(ctx, { grupo: "hormigon", tipo: "mixer" })) && ctx.recargar());
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-veh]");
    if (!b) return;
    const v = vehs.find((x) => x.id === Number(b.dataset.veh));
    if (await cambiarEstado(ctx, v, personal)) ctx.recargar();
  });
}
