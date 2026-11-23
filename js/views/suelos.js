import { esc, n1, fecha, hoyISO, modal, leerForm, campo, opciones, toast, vacio, icon, requerir, confirmar } from "../ui.js";
import { tarjetaVehiculo, cambiarEstado } from "./flota.js";

export async function render(el, ctx, { query }) {
  const hasta = query.get("hasta") || hoyISO();
  const desde = query.get("desde") || new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const [vehs, personal, clientes, partes] = await Promise.all([
    ctx.api.vehiculos.list(),
    ctx.api.personal.list(),
    ctx.api.clientes.list(),
    ctx.api.suelos.list({ desde, hasta }),
  ]);
  const equipos = vehs.filter((v) => v.activo && v.grupo === "suelos");
  const operadores = personal.filter((p) => p.activo && p.funcion !== "chofer");
  const totHoras = partes.reduce((s, t) => s + Number(t.horas || 0), 0);

  el.innerHTML = `
    <div class="barra">
      <button class="btn btn-primary btn-big" id="nuevo">${icon("mas")} Cargar parte diario</button>
      <span class="esp"></span>
      ${campo("Desde", `<input type="date" id="desde" value="${desde}">`)}
      ${campo("Hasta", `<input type="date" id="hasta" value="${hasta}">`)}
    </div>
    <div class="seccion" style="margin-top:0"><h2>Equipos <span class="cnt">· tocá uno para cambiar estado u operador</span></h2>
      <div class="flota-grid">${equipos.map((v) => tarjetaVehiculo(v, personal)).join("")}</div></div>
    <div class="seccion"><h2>Partes diarios <span class="cnt">· ${partes.length} registros · ${n1(totHoras)} horas</span></h2>
      ${partes.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Fecha</th><th>Equipo</th><th>Operador</th><th>Cliente / obra</th><th>Tarea</th><th class="num">Horas</th><th class="num">Viajes</th><th></th></tr></thead>
        <tbody>${partes.map((t) => `<tr>
          <td>${fecha(t.fecha + "T12:00")}</td><td><b>${esc(t.vehiculo_nombre)}</b> <small class="muted">${esc([t.vehiculo_marca, t.vehiculo_modelo, t.vehiculo_dominio].filter(Boolean).join(" "))}</small></td>
          <td>${esc(t.personal_nombre || "")}</td><td>${esc([t.cliente_nombre, t.obra].filter(Boolean).join(" · "))}</td>
          <td>${esc(t.tarea || "")}${t.nota ? `<br><small class="muted">${esc(t.nota)}</small>` : ""}</td>
          <td class="num">${t.horas != null ? n1(t.horas) : ""}</td><td class="num">${t.viajes ?? ""}</td>
          <td class="num">${ctx.esAdmin ? `<button class="btn btn-ghost btn-sm" data-borrar="${t.id}">Borrar</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>` : vacio("No hay partes en estas fechas.")}</div>`;

  const filtrar = () => (location.hash = `#/suelos?desde=${el.querySelector("#desde").value}&hasta=${el.querySelector("#hasta").value}`);
  el.querySelector("#desde").onchange = el.querySelector("#hasta").onchange = filtrar;

  el.querySelector("#nuevo").onclick = async () => {
    const promesa = modal({
      title: "Parte diario de equipo",
      wide: true,
      body: `<div class="form-grid">
        ${campo("Fecha", `<input name="fecha" type="date" value="${hoyISO()}" required>`)}
        ${campo("Equipo", `<select name="vehiculo_id" required>${opciones(equipos, "", { vacio: "— Elegí —", txt: (v) => `${v.denominacion} ${v.marca || ""} ${v.modelo || ""}${v.dominio ? " · " + v.dominio : ""}` })}</select>`)}
        ${campo("Operador", `<select name="personal_id">${opciones(operadores, "", { vacio: "— Elegí —" })}</select>`)}
        ${campo("Cliente (opcional)", `<select name="cliente_id">${opciones(clientes.filter((c) => c.activo), "", { vacio: "— Trabajo propio / sin cliente —" })}</select>`)}
        ${campo("Obra / lugar", `<input name="obra">`, "full")}
        ${campo("Tarea", `<input name="tarea" placeholder="Ej: excavación, nivelación, carga de camiones">`, "full")}
        ${campo("Horas trabajadas", `<input name="horas" type="number" min="0" max="24" step="0.5">`)}
        ${campo("Viajes (si aplica)", `<input name="viajes" type="number" min="0" step="1">`)}
        ${campo("Nota", `<input name="nota">`, "full")}
      </div>`,
      onOk: async (f) => {
        const o = leerForm(f);
        requerir(o, { fecha: "la fecha", vehiculo_id: "el equipo" });
        for (const k of ["vehiculo_id", "personal_id", "cliente_id"]) o[k] = o[k] ? Number(o[k]) : null;
        await ctx.api.suelos.crear(o);
      },
    });
    // al elegir equipo, proponer su operador asignado
    const bg = [...document.querySelectorAll(".modal-bg")].pop();
    bg.querySelector("[name=vehiculo_id]").addEventListener("change", (e) => {
      const v = equipos.find((x) => x.id === Number(e.target.value));
      const sel = bg.querySelector("[name=personal_id]");
      if (v?.personal_id && !sel.value) sel.value = v.personal_id;
    });
    const ok = await promesa;
    if (ok) {
      toast("Parte guardado.");
      ctx.recargar();
    }
  };
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-veh]");
    if (b) {
      const v = vehs.find((x) => x.id === Number(b.dataset.veh));
      if (await cambiarEstado(ctx, v, personal)) ctx.recargar();
    }
    const d = e.target.closest("[data-borrar]");
    if (d && (await confirmar("Borrar parte", "¿Borrar este parte diario?", "Borrar", true))) {
      await ctx.api.suelos.borrar(Number(d.dataset.borrar));
      toast("Borrado.");
      ctx.recargar();
    }
  });
}
