import api, { MODO_DEMO } from "./api.js";
import { esc, icon, toast, errorMsg } from "./ui.js";

const VISTAS = [
  { id: "planta", titulo: "Planta", icono: "planta", mod: () => import("./views/planta.js") },
  { id: "remitos", titulo: "Remitos", icono: "remito", mod: () => import("./views/remitos.js") },
  { id: "pedidos", titulo: "Pedidos", icono: "pedido", mod: () => import("./views/pedidos.js") },
  { id: "stock", titulo: "Stock", icono: "stock", mod: () => import("./views/stock.js") },
  { id: "clientes", titulo: "Clientes y cobros", icono: "clientes", mod: () => import("./views/clientes.js") },
  { sep: true },
  { id: "flota", titulo: "Flota", icono: "flota", mod: () => import("./views/flota.js") },
  { id: "personal", titulo: "Choferes y operadores", icono: "personal", mod: () => import("./views/personal.js") },
  { id: "suelos", titulo: "Movimiento de suelos", icono: "suelos", mod: () => import("./views/suelos.js") },
  { sep: true },
  { id: "reportes", titulo: "Reportes y Excel", icono: "reporte", mod: () => import("./views/reportes.js"), soloAdmin: true },
  { id: "formulas", titulo: "Fórmulas y precios", icono: "formula", mod: () => import("./views/formulas.js") },
  { id: "admin", titulo: "Usuarios y empresa", icono: "admin", mod: () => import("./views/admin.js"), soloAdmin: true },
];

const root = document.getElementById("app");
const ctx = {
  api,
  demo: MODO_DEMO,
  perfil: null,
  cfg: {},
  get esAdmin() {
    return ctx.perfil?.rol === "admin";
  },
  ir: (ruta) => (location.hash = "#/" + ruta),
  recargar: () => render(),
  async recargarConfig() {
    ctx.cfg = await api.config();
  },
};

// ---------------------------------------------------------------- login
function pantallaLogin(error = "") {
  root.innerHTML = `
    <div class="login">
      <div class="login-box">
        <div class="logo"><img src="img/logo.png" alt="LT Logística Transportadora S.A."></div>
        <h1>Sistema de planta</h1>
        <p>Ingresá con tu usuario y contraseña</p>
        <form class="card" id="f-login" autocomplete="on">
          <label class="field"><span>Usuario</span>
            <input name="usuario" autocomplete="username" autocapitalize="none" required placeholder="ej: juan"></label>
          <label class="field"><span>Contraseña</span>
            <input name="password" type="password" autocomplete="current-password" required></label>
          <p class="form-error" style="margin:0" ${error ? "" : "hidden"}>${esc(error)}</p>
          <button class="btn btn-primary btn-big" type="submit">Ingresar</button>
        </form>
        ${
          MODO_DEMO
            ? `<div class="login-demo"><b>Modo demostración</b> (los datos quedan solo en este navegador).<br>
               Usuario <b>admin</b> / contraseña <b>admin</b> · o <b>operador</b> / <b>operador</b></div>`
            : `<div class="login-demo">¿Olvidaste la contraseña? Pedile al administrador que te la cambie.</div>`
        }
      </div>
    </div>`;
  const f = document.getElementById("f-login");
  f.usuario.focus();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Ingresando…";
    try {
      ctx.perfil = await api.auth.login(f.usuario.value, f.password.value);
      await ctx.recargarConfig();
      if (!location.hash || location.hash === "#/") location.hash = "#/planta";
      render();
    } catch (ex) {
      pantallaLogin(errorMsg(ex));
    }
  });
}

// ---------------------------------------------------------------- shell
function armarShell() {
  const ini = (ctx.perfil.nombre || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  root.innerHTML = `
    ${MODO_DEMO ? `<div class="demo-banner"><div>MODO DEMOSTRACIÓN · datos de prueba guardados solo en este navegador</div></div>` : ""}
    <div class="shell">
      <aside class="side">
        <div class="marca"><img src="img/logo.png" alt="LT Logística Transportadora S.A."><small>Sistema de planta</small></div>
        <nav>
          ${VISTAS.filter((v) => !v.soloAdmin || ctx.esAdmin)
            .map((v) => (v.sep ? `<div class="sep"></div>` : `<a href="#/${v.id}" data-v="${v.id}">${icon(v.icono)}<span>${v.titulo}</span></a>`))
            .join("")}
          <a href="#" id="instalar" hidden>${icon("instalar")}<span>Instalar app</span></a>
        </nav>
        <div class="yo">
          <span class="av">${esc(ini)}</span>
          <div title="${esc(ctx.perfil.nombre)} · usuario: ${esc(ctx.perfil.usuario)}"><b>${esc(ctx.perfil.nombre)}</b><small>${ctx.esAdmin ? "Administrador" : "Operador"}</small></div>
          <button id="mi-pass" title="Cambiar mi contraseña" aria-label="Cambiar mi contraseña">${icon("candado")}</button>
          <button id="salir" title="Cerrar sesión" aria-label="Cerrar sesión">${icon("salir")}</button>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <button class="btn btn-ghost btn-sm menu-btn" id="menu" aria-label="Menú">${icon("menu")}</button>
          <h1 id="titulo"></h1>
          <span class="reloj" id="reloj"></span>
        </header>
        <main class="contenido" id="vista"></main>
      </div>
    </div>`;
  document.getElementById("salir").onclick = async () => {
    await api.auth.logout();
    ctx.perfil = null;
    location.hash = "";
    pantallaLogin();
  };
  document.getElementById("mi-pass").onclick = async () => {
    const { cambiarPassword } = await import("./views/admin.js");
    cambiarPassword(ctx, ctx.perfil);
  };
  prepararInstalar();
  const shell = root.querySelector(".shell");
  document.getElementById("menu").onclick = () => shell.classList.toggle("menu-abierto");
  root.querySelector(".side nav").addEventListener("click", () => shell.classList.remove("menu-abierto"));
  const reloj = () => {
    const el = document.getElementById("reloj");
    if (el) el.textContent = new Date().toLocaleString("es-AR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };
  reloj();
  clearInterval(window._reloj);
  window._reloj = setInterval(reloj, 30000);
}

// ---------------------------------------------------------------- router
let renderId = 0;
async function render() {
  if (!ctx.perfil) return pantallaLogin();
  if (!document.getElementById("vista")) armarShell();
  const [ruta, query] = location.hash.replace(/^#\/?/, "").split("?");
  const [vistaId, ...params] = ruta.split("/");
  const v = VISTAS.find((x) => x.id === vistaId && (!x.soloAdmin || ctx.esAdmin));
  if (!v) return ctx.ir("planta");
  document.querySelectorAll(".side nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === v.id));
  document.getElementById("titulo").textContent = v.titulo;
  document.title = `${v.titulo} · LT Hormigones`;
  // contenedor nuevo en cada render: así no se acumulan eventos de pantallas anteriores
  const viejo = document.getElementById("vista");
  const cont = viejo.cloneNode(false);
  viejo.replaceWith(cont);
  const mio = ++renderId;
  cont.innerHTML = `<div class="muted" style="padding:20px">Cargando…</div>`;
  try {
    const mod = await v.mod();
    if (mio !== renderId) return;
    await mod.render(cont, ctx, { params, query: new URLSearchParams(query || "") });
    if (mio === renderId) window.scrollTo(0, 0);
  } catch (ex) {
    console.error(ex);
    if (/sesión venció/i.test(errorMsg(ex))) {
      ctx.perfil = null;
      return pantallaLogin("Tu sesión venció. Volvé a ingresar.");
    }
    cont.innerHTML = `<div class="alerta mal">${icon("alerta")} No se pudo cargar esta pantalla: ${esc(errorMsg(ex))}</div>
      <button class="btn" onclick="location.reload()">Reintentar</button>`;
  }
}

// ---------------------------------------------------------------- instalar como app
let pedidoInstalar = null;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  pedidoInstalar = e;
  prepararInstalar();
});
window.addEventListener("appinstalled", () => {
  pedidoInstalar = null;
  prepararInstalar();
  toast("App instalada. Ya la podés abrir desde su ícono.");
});
function prepararInstalar() {
  const a = document.getElementById("instalar");
  if (!a) return;
  a.hidden = instalada();
  a.onclick = async (e) => {
    e.preventDefault();
    if (pedidoInstalar) {
      pedidoInstalar.prompt();
      await pedidoInstalar.userChoice;
      pedidoInstalar = null;
      prepararInstalar();
      return;
    }
    const { modal } = await import("./ui.js");
    const esEdge = /Edg\//.test(navigator.userAgent);
    const esAndroid = /android/i.test(navigator.userAgent);
    const pasos = esIOS
      ? `<li>Abrí esta página en <b>Safari</b>.</li>
         <li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
         <li>Elegí <b>Agregar a inicio</b> y tocá <b>Agregar</b>.</li>`
      : esAndroid
      ? `<li>En Chrome, tocá el menú <b>⋮</b> (arriba a la derecha).</li>
         <li>Elegí <b>Instalar app</b> o <b>Agregar a pantalla principal</b>.</li>`
      : esEdge
      ? `<li>Tocá el menú <b>…</b> de Edge (arriba a la derecha).</li>
         <li>Entrá a <b>Aplicaciones</b> → <b>Instalar este sitio como una aplicación</b>.</li>
         <li>O tocá el ícono de instalar que aparece a la derecha de la barra de direcciones.</li>`
      : `<li>Tocá el ícono de instalar a la derecha de la barra de direcciones (una pantalla con una flecha).</li>
         <li>Si no está: menú <b>⋮</b> → <b>Transmitir, guardar y compartir</b> → <b>Instalar página como app</b>.</li>`;
    modal({
      title: "Instalar LT Planta",
      okText: "Entendido",
      cancelText: "",
      body: `<ol style="line-height:1.8;padding-left:20px;margin:0">${pasos}
        <li>Después abrila desde el ícono <b>LT Planta</b>.</li></ol>
        <p class="ayuda">Si la opción no aparece, puede que la computadora tenga bloqueada la instalación de apps: en ese caso seguí usándola desde el navegador, funciona igual.</p>`,
    });
  };
}
if ("serviceWorker" in navigator) {
  const registrar = () => navigator.serviceWorker.register("sw.js").catch(() => {});
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar);
}

window.addEventListener("hashchange", render);

(async () => {
  try {
    ctx.perfil = await api.auth.perfil();
    if (ctx.perfil) await ctx.recargarConfig();
  } catch (ex) {
    ctx.perfil = null;
    toast(errorMsg(ex), "error");
  }
  render();
})();
