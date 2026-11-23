// Modal para registrar un pago con contraseña (firma de responsable).
import { esc, $, modal, campo, toast, MEDIOS, icon } from "./ui.js";

export const bloqueMedios = (sel = "", conCuenta = false) => `
  <div class="medios">
    ${conCuenta ? `<label><input type="radio" name="medio" value="" ${sel === "" ? "checked" : ""}>A cuenta<br><small class="muted">cobrar después</small></label>` : ""}
    ${Object.entries(MEDIOS).map(([k, t]) => `<label><input type="radio" name="medio" value="${k}" ${sel === k ? "checked" : ""}>${t}</label>`).join("")}
  </div>`;

export const bloqueFirma = (ctx) => `
  <div class="firma">
    <p>${icon("candado")} Confirmá con TU contraseña: queda registrado que ${esc(ctx.perfil.nombre)} cargó este pago.</p>
    ${campo("Tu contraseña", `<input name="password" type="password" autocomplete="current-password" required>`)}
  </div>`;

/**
 * Registrar pago. Si viene `remito`, el monto sugerido es su saldo.
 * Devuelve true si se registró.
 */
export async function registrarPago(ctx, { cliente_id, cliente_nombre, remito = null, saldo = 0 }) {
  const sugerido = remito ? Math.max(Number(remito.total) - Number(remito.pagado || 0), 0) : Math.max(Number(saldo), 0);
  const ok = await modal({
    title: remito ? `Cobrar remito N° ${remito.numero}` : `Registrar pago · ${cliente_nombre}`,
    body: `
      <p class="muted" style="margin-top:0">Cliente: <b style="color:var(--texto)">${esc(cliente_nombre)}</b>
        ${remito ? ` · Total del remito ${$(remito.total)}` : ` · Saldo actual ${$(saldo)}`}</p>
      <div style="margin-bottom:14px"><span class="ayuda">¿Cómo pagó?</span>${bloqueMedios("contado")}</div>
      <div class="form-grid">
        ${campo("Monto ($)", `<input name="monto" type="number" min="0.01" step="0.01" value="${sugerido ? sugerido.toFixed(2) : ""}" required inputmode="decimal">`)}
        ${campo("Referencia (opcional)", `<input name="referencia" placeholder="N° de operación o boleta">`)}
      </div>
      ${bloqueFirma(ctx)}`,
    okText: "Confirmar pago",
    onOk: async (f) => {
      const medio = f.querySelector("input[name=medio]:checked")?.value;
      if (!medio) throw new Error("Elegí cómo pagó.");
      const monto = Number(f.monto.value);
      if (!(monto > 0)) throw new Error("Indicá el monto.");
      if (!f.password.value) throw new Error("Escribí tu contraseña para confirmar.");
      await ctx.api.pagos.confirmar({
        cliente_id,
        remito_id: remito?.id ?? null,
        monto,
        medio,
        referencia: f.referencia.value.trim() || null,
        password: f.password.value,
      });
    },
  });
  if (ok) toast("Pago registrado.");
  return !!ok;
}

/** Anular pago o remito (admin) con motivo y contraseña. */
export async function anularConFirma(ctx, titulo, texto, accion) {
  const ok = await modal({
    title: titulo,
    danger: true,
    okText: "Anular",
    body: `<p style="margin-top:0">${texto}</p>
      ${campo("Motivo", `<input name="motivo" required placeholder="Ej: error de carga">`)}
      <div class="firma"><p>${icon("candado")} Confirmá con tu contraseña</p>${campo("Tu contraseña", `<input name="password" type="password" required>`)}</div>`,
    onOk: async (f) => {
      if (!f.motivo.value.trim()) throw new Error("Escribí el motivo.");
      await accion(f.motivo.value.trim(), f.password.value);
    },
  });
  if (ok) toast("Anulado.");
  return !!ok;
}
