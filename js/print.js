// Impresión del remito: 3 copias (Administración, Chofer, Cliente), una por hoja.
import { esc, n1, $, fechaHora, numeroRemito, MEDIOS } from "./ui.js";

const COPIAS = [
  ["ORIGINAL", "ADMINISTRACIÓN"],
  ["DUPLICADO", "CHOFER"],
  ["TRIPLICADO", "CLIENTE"],
];

function textoPago(r) {
  if (r.estado === "anulado") return "REMITO ANULADO";
  if (r.pago_estado === "pagado") {
    const m = (r.medios_pago || "").split(", ").map((x) => (MEDIOS[x] || x).toUpperCase()).join(" + ");
    return `PAGADO — ${m}`;
  }
  if (r.pago_estado === "parcial") return `PAGO PARCIAL: ${$(r.pagado)} de ${$(r.total)} — SALDO EN CUENTA CORRIENTE`;
  if (r.pago_estado === "sin precio") return "SIN PRECIO CARGADO";
  return "PENDIENTE DE PAGO — CUENTA CORRIENTE";
}

export function htmlRemito(r, cfg, copias = COPIAS) {
  const nro = numeroRemito(r.numero, cfg.remito_punto_venta || "0001");
  return copias
    .map(
      ([tipo, para]) => `
    <section class="copia">
      <div class="cab">
        <div>
          <img src="img/logo.png" alt="">
          <div style="font-size:9pt;margin-top:2mm">
            <b>${esc(cfg.empresa_nombre || "")}</b> ${cfg.empresa_linea2 ? "· " + esc(cfg.empresa_linea2) : ""}<br>
            ${cfg.empresa_cuit ? "CUIT " + esc(cfg.empresa_cuit) + " · " : ""}${esc(cfg.empresa_direccion || "")}${cfg.empresa_telefono ? " · Tel. " + esc(cfg.empresa_telefono) : ""}
          </div>
        </div>
        <div class="r">X</div>
        <div class="der">
          <h1>REMITO</h1>
          <div class="nro">N° ${nro}</div>
          <div>Fecha: <b>${fechaHora(r.fecha)}</b></div>
          <div style="font-size:8.5pt">Documento no válido como factura</div>
        </div>
      </div>
      <div class="tipo-copia">${tipo} · ${para}</div>
      ${r.estado === "anulado" ? `<div class="anulado">ANULADO — ${esc(r.motivo_anulacion || "")}</div>` : ""}
      <div class="datos">
        <div><b>Cliente:</b> ${esc(r.cliente_nombre)}</div>
        <div><b>CUIT/DNI:</b> ${esc(r.cliente_cuit || "")}</div>
        <div style="grid-column:1/-1"><b>Obra / entrega:</b> ${esc(r.obra_direccion || "")}</div>
        <div><b>Teléfono:</b> ${esc(r.cliente_telefono || "")}</div>
        <div><b>Pedido N°:</b> ${r.pedido_id ?? "—"}</div>
        <div><b>Mixer:</b> ${esc([r.vehiculo_nombre, r.vehiculo_dominio].filter(Boolean).join(" · ") || "—")}</div>
        <div><b>Chofer:</b> ${esc(r.chofer_nombre || "—")}</div>
        <div><b>Bomba:</b> ${esc(r.bomba_nombre || "No")}</div>
        <div><b>Emitido por:</b> ${esc(r.creado_por_nombre || "")}</div>
      </div>
      <table>
        <thead><tr><th>Producto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody><tr>
          <td><b>Hormigón elaborado ${esc(r.formula_nombre)}</b></td>
          <td style="text-align:right"><b>${n1(r.m3)} m³</b></td>
          <td style="text-align:right">${$(r.precio_m3)}</td>
          <td style="text-align:right"><b>${$(r.total)}</b></td>
        </tr></tbody>
        <tfoot><tr><td colspan="3" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right;font-size:13pt"><b>${$(r.total)}</b></td></tr></tfoot>
      </table>
      <div class="pago">${textoPago(r)}</div>
      ${r.nota ? `<div><b>Observaciones:</b> ${esc(r.nota)}</div>` : ""}
      <div class="datos">
        <div><b>Hora salida planta:</b> ${new Date(r.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</div>
        <div><b>Hora llegada obra:</b> ____________</div>
        <div><b>Inicio descarga:</b> ____________</div>
        <div><b>Fin descarga:</b> ____________</div>
      </div>
      <div class="firmas">
        <div>Firma chofer</div>
        <div>Recibí conforme — firma, aclaración y DNI del cliente</div>
      </div>
      <div class="pie">${tipo} · ${para} · Remito N° ${nro}</div>
    </section>`
    )
    .join("");
}

export function imprimirRemito(r, cfg) {
  const area = document.getElementById("print-area");
  area.innerHTML = htmlRemito(r, cfg);
  const img = area.querySelector("img");
  const go = () =>
    setTimeout(() => {
      try {
        window.print();
      } catch {}
    }, 50);
  if (img && !img.complete) img.onload = img.onerror = go;
  else go();
}
