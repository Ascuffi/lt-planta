import { esc, fecha, modal, leerForm, campo, toast, icon, badge, requerir, numeroRemito } from "../ui.js";

async function formUsuario(ctx) {
  const ok = await modal({
    title: "Nuevo usuario",
    body: `<div class="form-grid">
      ${campo("Nombre y apellido", `<input name="nombre" required>`, "full")}
      ${campo("Usuario (para ingresar)", `<input name="usuario" required autocapitalize="none" placeholder="ej: juan" pattern="[a-z0-9._-]{3,30}">`)}
      ${campo("Contraseña inicial", `<input name="password" required minlength="6" autocomplete="new-password">`)}
      ${campo("Rol", `<select name="rol"><option value="operador">Operador</option><option value="admin">Administrador</option></select>`, "full")}
    </div>
    <p class="ayuda">El usuario va en minúsculas, sin espacios ni acentos (ej: <b>jperez</b>). Anotale la contraseña y pedile que la cambie desde «Mi contraseña».</p>
    <p class="ayuda"><b>Operador</b>: remitos, pedidos, stock, cobros, flota y partes. <b>Administrador</b>: además precios, fórmulas, anulaciones, usuarios y altas de flota/personal.</p>`,
    onOk: async (f) => {
      const o = leerForm(f);
      requerir(o, { nombre: "el nombre", usuario: "el usuario", password: "la contraseña" });
      await ctx.api.usuarios.crear({ ...o, usuario: o.usuario.toLowerCase() });
    },
  });
  if (ok) toast("Usuario creado.");
  return ok;
}

export async function cambiarPassword(ctx, u) {
  const ok = await modal({
    title: `Contraseña de ${u.nombre}`,
    body: `${campo("Nueva contraseña (mínimo 6)", `<input name="password" required minlength="6" autocomplete="new-password">`)}`,
    onOk: async (f) => {
      if (f.password.value.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
      await ctx.api.usuarios.password(u.id, f.password.value);
    },
  });
  if (ok) toast("Contraseña cambiada.");
}

export async function render(el, ctx) {
  const usuarios = await ctx.api.usuarios.list();
  const c = ctx.cfg;
  el.innerHTML = `
    <div class="seccion" style="margin-top:0">
      <h2>Usuarios <span class="cnt">· cada empleado entra con su usuario y contraseña</span></h2>
      <div class="barra"><button class="btn btn-primary" id="nuevo">${icon("mas")} Nuevo usuario</button></div>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th class="solo-escritorio">Alta</th><th></th></tr></thead>
        <tbody>${usuarios.map((u) => `<tr data-id="${u.id}" ${u.activo ? "" : 'style="opacity:.55"'}>
          <td><b>${esc(u.nombre)}</b>${u.id === ctx.perfil.id ? " " + badge("vos", "info") : ""}</td>
          <td><code>${esc(u.usuario)}</code></td>
          <td><select data-rol style="min-height:36px;width:auto"><option value="operador" ${u.rol === "operador" ? "selected" : ""}>Operador</option><option value="admin" ${u.rol === "admin" ? "selected" : ""}>Administrador</option></select></td>
          <td>${u.activo ? badge("Activo", "ok") : badge("Deshabilitado", "mal")}</td>
          <td class="solo-escritorio">${fecha(u.creado_en)}</td>
          <td class="num" style="white-space:nowrap">
            <button class="btn btn-sm" data-pass>Cambiar contraseña</button>
            <button class="btn btn-ghost btn-sm" data-activo>${u.activo ? "Deshabilitar" : "Habilitar"}</button></td></tr>`).join("")}
        </tbody></table></div>
      <p class="ayuda">Si alguien deja la empresa, <b>deshabilitalo</b> (no se borra, para no perder el registro de lo que cargó).</p>
    </div>

    <div class="seccion">
      <h2>Datos de la empresa <span class="cnt">· salen impresos en el remito</span></h2>
      <form class="card form-grid" id="empresa">
        ${campo("Razón social", `<input name="empresa_nombre" value="${esc(c.empresa_nombre)}">`)}
        ${campo("Nombre comercial", `<input name="empresa_linea2" value="${esc(c.empresa_linea2)}">`)}
        ${campo("CUIT", `<input name="empresa_cuit" value="${esc(c.empresa_cuit)}">`)}
        ${campo("Teléfono", `<input name="empresa_telefono" value="${esc(c.empresa_telefono)}">`)}
        ${campo("Dirección", `<input name="empresa_direccion" value="${esc(c.empresa_direccion)}">`, "full")}
        ${campo("Punto de venta del remito", `<input name="remito_punto_venta" value="${esc(c.remito_punto_venta || "0001")}" maxlength="5">`)}
        ${campo("Número del primer remito", `<input name="remito_numero_inicial" type="number" min="1" value="${esc(c.remito_numero_inicial || "1")}">`)}
        <p class="ayuda full">Si ya venían usando talonario, poné el número siguiente al último en papel. Ejemplo de cómo sale: <b>${numeroRemito(Number(c.remito_numero_inicial) || 1, c.remito_punto_venta || "0001")}</b></p>
        <div class="full acciones"><button class="btn btn-primary" type="submit">Guardar datos</button></div>
      </form>
    </div>
    ${ctx.demo ? `<div class="seccion"><h2>Demostración</h2><button class="btn" id="reset">Volver a los datos de prueba iniciales</button></div>` : ""}`;

  el.querySelector("#nuevo").onclick = async () => (await formUsuario(ctx)) && ctx.recargar();
  el.querySelector("#empresa").onsubmit = async (e) => {
    e.preventDefault();
    const o = {};
    for (const i of e.target.elements) if (i.name) o[i.name] = i.value.trim();
    o.remito_punto_venta = (o.remito_punto_venta || "1").padStart(4, "0");
    try {
      await ctx.api.guardarConfig(o);
      await ctx.recargarConfig();
      toast("Datos guardados.");
      ctx.recargar();
    } catch (ex) {
      toast(ex.message, "error");
    }
  };
  el.querySelector("#reset")?.addEventListener("click", async () => {
    ctx.api.reiniciarDemo();
    location.reload();
  });
  el.querySelector("tbody").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const u = usuarios.find((x) => x.id === tr.dataset.id);
    try {
      if (e.target.closest("[data-pass]")) await cambiarPassword(ctx, u);
      if (e.target.closest("[data-activo]")) {
        if (u.id === ctx.perfil.id) throw new Error("No podés deshabilitarte a vos mismo.");
        await ctx.api.usuarios.guardar(u.id, { activo: !u.activo });
        toast(u.activo ? "Usuario deshabilitado." : "Usuario habilitado.");
        ctx.recargar();
      }
    } catch (ex) {
      toast(ex.message, "error");
    }
  });
  el.querySelector("tbody").addEventListener("change", async (e) => {
    if (!e.target.matches("[data-rol]")) return;
    const id = e.target.closest("tr").dataset.id;
    try {
      await ctx.api.usuarios.guardar(id, { rol: e.target.value });
      toast("Rol actualizado.");
    } catch (ex) {
      toast(ex.message, "error");
      ctx.recargar();
    }
  });
}
