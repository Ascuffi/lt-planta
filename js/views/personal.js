import { esc, fecha, modal, leerForm, campo, toast, vacio, icon, badge, requerir } from "../ui.js";

const FUNCIONES = ["chofer", "operador", "chofer y operador"];

async function formPersona(ctx, p = {}) {
  const ok = await modal({
    title: p.id ? "Editar" : "Agregar chofer u operador",
    body: `<div class="form-grid">
      ${campo("Nombre y apellido", `<input name="nombre" required value="${esc(p.nombre)}">`, "full")}
      ${campo("Función", `<select name="funcion">${FUNCIONES.map((f) => `<option ${p.funcion === f ? "selected" : ""}>${f}</option>`).join("")}</select>`)}
      ${campo("Teléfono", `<input name="telefono" type="tel" value="${esc(p.telefono)}">`)}
      ${campo("DNI", `<input name="dni" value="${esc(p.dni)}">`)}
      ${campo("Vencimiento de licencia / habilitación", `<input name="venc_licencia" type="date" value="${p.venc_licencia ?? ""}">`)}
      ${campo("Nota", `<input name="nota" value="${esc(p.nota)}">`, "full")}
      ${p.id ? `<label class="check full"><input type="checkbox" name="activo" ${p.activo !== false ? "checked" : ""}> Activo (destildar si ya no trabaja en la empresa)</label>` : ""}
    </div>`,
    onOk: async (f) => {
      const o = leerForm(f);
      requerir(o, { nombre: "el nombre" });
      if (p.id) o.id = p.id;
      await ctx.api.personal.guardar(o);
    },
  });
  if (ok) toast("Guardado.");
  return ok;
}

export async function render(el, ctx) {
  const [pers, vehs] = await Promise.all([ctx.api.personal.list(), ctx.api.vehiculos.list()]);
  const hoy = new Date();
  const en30 = new Date(Date.now() + 30 * 864e5);
  const venc = (p) => {
    if (!p.venc_licencia) return "";
    const d = new Date(p.venc_licencia + "T12:00");
    return d < hoy ? badge("VENCIDA " + fecha(d), "mal") : d < en30 ? badge("vence " + fecha(d), "warn") : fecha(d);
  };
  el.innerHTML = `
    <div class="barra">
      ${ctx.esAdmin ? `<button class="btn btn-primary btn-big" id="nuevo">${icon("mas")} Agregar</button>` : `<p class="muted" style="margin:0">Para agregar personas pedíselo al administrador.</p>`}
    </div>
    ${pers.filter((p) => p.activo && p.venc_licencia && new Date(p.venc_licencia + "T12:00") < en30).map((p) => `<div class="alerta">${icon("alerta")} Licencia de ${esc(p.nombre)}: ${new Date(p.venc_licencia + "T12:00") < hoy ? "VENCIDA" : "vence pronto"} (${fecha(p.venc_licencia + "T12:00")}).</div>`).join("")}
    ${pers.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>Nombre</th><th>Función</th><th>Teléfono</th><th>Licencia</th><th>Asignado a</th><th></th></tr></thead>
      <tbody>${pers.map((p) => {
        const asig = vehs.filter((v) => v.personal_id === p.id && v.activo);
        return `<tr ${p.activo ? "" : 'style="opacity:.5"'}>
          <td><b>${esc(p.nombre)}</b>${p.activo ? "" : " " + badge("inactivo", "muted")}</td><td>${esc(p.funcion)}</td>
          <td>${p.telefono ? `<a href="tel:${esc(p.telefono)}">${esc(p.telefono)}</a>` : ""}</td><td>${venc(p)}</td>
          <td>${asig.map((v) => esc(`${v.denominacion}${v.dominio ? " " + v.dominio : ""}`)).join("<br>") || '<span class="muted">—</span>'}</td>
          <td class="num"><button class="btn btn-sm" data-id="${p.id}">Editar</button></td></tr>`;
      }).join("")}</tbody></table></div>` : vacio("Todavía no hay choferes ni operadores cargados.")}
    <p class="ayuda">Para asignar un chofer a un mixer o un operador a un equipo, tocá la unidad en Planta o en Flota.</p>`;
  el.querySelector("#nuevo")?.addEventListener("click", async () => (await formPersona(ctx)) && ctx.recargar());
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-id]");
    if (b && (await formPersona(ctx, pers.find((p) => p.id === Number(b.dataset.id))))) ctx.recargar();
  });
}
