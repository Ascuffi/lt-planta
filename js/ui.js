// Utilidades de interfaz: escape, formatos, modales, avisos.

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });

export const n0 = (v) => nf0.format(Number(v) || 0);
export const n1 = (v) => nf1.format(Number(v) || 0);
export const $ = (v) => money.format(Number(v) || 0);

export const fecha = (d) => (d ? new Date(d).toLocaleDateString("es-AR") : "");
export const fechaHora = (d) =>
  d ? new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "";
export const hoyISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const esHoy = (d) => d && new Date(d).toDateString() === new Date().toDateString();

/** Cantidad con unidad: kg grandes se muestran en toneladas. */
export const cant = (v, unidad) => {
  v = Number(v) || 0;
  if (unidad === "kg" && Math.abs(v) >= 10000) return `${n1(v / 1000)} t`;
  return `${n0(v)} ${unidad}`;
};

export const MEDIOS = { contado: "Contado (efectivo)", transferencia: "Transferencia", deposito: "Depósito" };
export const ESTADOS_VEHICULO = {
  disponible: "En planta",
  en_viaje: "En viaje",
  trabajando: "Trabajando",
  taller: "En taller",
};

export function numeroRemito(num, pv = "0001") {
  return `${pv}-${String(num).padStart(8, "0")}`;
}

// ------------------------------------------------------------- avisos
export function toast(msg, tipo = "ok") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  t.setAttribute("role", "status");
  t.textContent = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => t.classList.add("out"), tipo === "error" ? 6000 : 3200);
  setTimeout(() => t.remove(), tipo === "error" ? 6500 : 3700);
}

export function errorMsg(e) {
  const m = e?.message || String(e);
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sin conexión con el servidor. Revisá internet y probá de nuevo.";
  if (/JWT|session/i.test(m)) return "Tu sesión venció. Volvé a ingresar.";
  return m;
}

// ------------------------------------------------------------- modal
/**
 * Abre un modal. `body` es HTML. `onOk(form)` puede devolver false para no cerrar.
 * Devuelve una promesa que se resuelve con el valor de onOk o null si se cancela.
 */
export function modal({ title, body, okText = "Guardar", cancelText = "Cancelar", onOk, wide = false, danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-bg";
    wrap.innerHTML = `
      <form class="modal ${wide ? "modal-wide" : ""}" novalidate>
        <header><h2>${esc(title)}</h2><button type="button" class="x" aria-label="Cerrar">×</button></header>
        <div class="modal-body">${body}</div>
        <p class="form-error" hidden></p>
        <footer>
          ${cancelText ? `<button type="button" class="btn btn-ghost cancel">${esc(cancelText)}</button>` : ""}
          ${okText ? `<button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"} ok">${esc(okText)}</button>` : ""}
        </footer>
      </form>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector("form");
    const err = wrap.querySelector(".form-error");
    const close = (val) => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onKey = (e) => e.key === "Escape" && close(null);
    document.addEventListener("keydown", onKey);
    wrap.querySelector(".x").onclick = () => close(null);
    wrap.querySelector(".cancel")?.addEventListener("click", () => close(null));
    wrap.addEventListener("mousedown", (e) => e.target === wrap && close(null));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const btn = form.querySelector(".ok");
      if (!onOk) return close(true);
      try {
        btn.disabled = true;
        btn.dataset.txt = btn.textContent;
        btn.textContent = "Procesando…";
        const res = await onOk(form);
        if (res === false) return;
        close(res === undefined ? true : res);
      } catch (ex) {
        err.textContent = errorMsg(ex);
        err.hidden = false;
      } finally {
        if (btn.isConnected) {
          btn.disabled = false;
          btn.textContent = btn.dataset.txt;
        }
      }
    });
    setTimeout(() => form.querySelector("input:not([type=hidden]):not([readonly]),select,textarea")?.focus(), 30);
    wrap._form = form;
  });
}

export const confirmar = (title, texto, okText = "Confirmar", danger = false) =>
  modal({ title, body: `<p>${texto}</p>`, okText, danger });

/** Lee un formulario a objeto (números como number, checkbox como bool). */
export function leerForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") o[el.name] = el.checked;
    else if (el.type === "number") o[el.name] = el.value === "" ? null : Number(el.value);
    else o[el.name] = el.value.trim() === "" ? null : el.value.trim();
  }
  return o;
}

export function requerir(o, campos) {
  for (const [k, label] of Object.entries(campos)) {
    if (o[k] === null || o[k] === undefined || o[k] === "") throw new Error(`Completá: ${label}.`);
  }
}

// ------------------------------------------------------------- campos
export const campo = (label, input, extra = "") => `<label class="field ${extra}"><span>${esc(label)}</span>${input}</label>`;

export const opciones = (items, valor, { vacio = null, val = (x) => x.id, txt = (x) => x.nombre } = {}) =>
  (vacio !== null ? `<option value="">${esc(vacio)}</option>` : "") +
  items
    .map((x) => `<option value="${esc(val(x))}" ${String(val(x)) === String(valor ?? "") ? "selected" : ""}>${esc(txt(x))}</option>`)
    .join("");

export const vacio = (texto) => `<div class="empty">${esc(texto)}</div>`;

export const badge = (texto, tipo = "") => `<span class="badge ${tipo}">${esc(texto)}</span>`;

export function badgePago(estado, medios) {
  const m = { pagado: "ok", pendiente: "warn", parcial: "warn", anulado: "muted", "sin precio": "muted" };
  const txt =
    estado === "pagado"
      ? `Pagado · ${(medios || "").split(", ").map((x) => MEDIOS[x]?.split(" ")[0] || x).join(" + ")}`
      : estado === "pendiente" ? "A cobrar" : estado === "parcial" ? "Pago parcial" : estado === "anulado" ? "Anulado" : "Sin precio";
  return badge(txt, m[estado] || "");
}

export const icon = (name) => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;
