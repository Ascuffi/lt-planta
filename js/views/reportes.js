import { esc, n0, n1, $, campo, icon, toast, vacio, numeroRemito, MEDIOS, hoyISO, errorMsg } from "../ui.js";
import { crearXlsx, hojaTabla, descargar } from "../xlsx.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const MAT_COL = { piedra620: "Piedra 6/20 (kg)", piedra06: "Piedra 0/6 (kg)", arena: "Arena (kg)", agua: "Agua (L)" };

/** Calcula todo el balance del período a partir de los datos crudos. */
export function calcularBalance(datos, desde, hasta) {
  const d1 = new Date(hasta + "T23:59:59.999").toISOString();
  const emitidos = datos.remitos.filter((r) => r.estado === "emitido");
  const anulados = datos.remitos.filter((r) => r.estado === "anulado");

  // hormigón por tipo
  const porTipo = {};
  for (const r of emitidos) {
    const t = (porTipo[r.formula_nombre] ||= { tipo: r.formula_nombre, remitos: 0, m3: 0, total: 0, pagado: 0 });
    t.remitos++;
    t.m3 += Number(r.m3);
    t.total += Number(r.total);
    t.pagado += Math.min(Number(r.pagado), Number(r.total));
  }
  const tipos = Object.values(porTipo).sort((a, b) => b.m3 - a.m3);

  // por cliente
  const porCliente = {};
  const saldo = Object.fromEntries(datos.cuentas.map((c) => [c.id, c.saldo]));
  for (const r of emitidos) {
    const c = (porCliente[r.cliente_id] ||= { cliente: r.cliente_nombre, id: r.cliente_id, remitos: 0, m3: 0, total: 0, cobrado: 0 });
    c.remitos++;
    c.m3 += Number(r.m3);
    c.total += Number(r.total);
  }
  const pagosValidos = datos.pagos.filter((p) => !p.anulado);
  for (const p of pagosValidos) {
    const c = (porCliente[p.cliente_id] ||= { cliente: p.cliente_nombre, id: p.cliente_id, remitos: 0, m3: 0, total: 0, cobrado: 0 });
    c.cobrado += Number(p.monto);
  }
  const clientes = Object.values(porCliente).map((c) => ({ ...c, saldo: saldo[c.id] ?? 0 })).sort((a, b) => b.total - a.total);

  // materiales: stock al inicio y al cierre, ingresos, consumos, ajustes
  const materiales = datos.materiales.map((m) => {
    const movs = datos.movimientos.filter((x) => x.material_id === m.id);
    const enPeriodo = movs.filter((x) => x.creado_en <= d1);
    const despues = movs.filter((x) => x.creado_en > d1).reduce((s, x) => s + Number(x.cantidad), 0);
    const suma = (tipo) => enPeriodo.filter((x) => x.tipo === tipo).reduce((s, x) => s + Number(x.cantidad), 0);
    const final = Number(m.stock) - despues;
    const neto = enPeriodo.reduce((s, x) => s + Number(x.cantidad), 0);
    return {
      id: m.id, nombre: m.nombre, unidad: m.unidad,
      inicial: final - neto, ingresos: suma("ingreso"), consumos: -suma("consumo"),
      devoluciones: suma("anulacion"), ajustes: suma("ajuste"), final,
    };
  });

  // cobros por medio
  const cobros = Object.keys(MEDIOS).map((k) => ({
    medio: MEDIOS[k],
    cantidad: pagosValidos.filter((p) => p.medio === k).length,
    monto: pagosValidos.filter((p) => p.medio === k).reduce((s, p) => s + Number(p.monto), 0),
  }));

  // movimiento de suelos por equipo
  const porEquipo = {};
  for (const t of datos.suelos) {
    const k = t.vehiculo_id;
    const e = (porEquipo[k] ||= { equipo: `${t.vehiculo_nombre}${t.vehiculo_dominio ? " · " + t.vehiculo_dominio : ""}`, partes: 0, horas: 0, viajes: 0 });
    e.partes++;
    e.horas += Number(t.horas || 0);
    e.viajes += Number(t.viajes || 0);
  }

  const tot = {
    remitos: emitidos.length,
    anulados: anulados.length,
    m3: emitidos.reduce((s, r) => s + Number(r.m3), 0),
    vendido: emitidos.reduce((s, r) => s + Number(r.total), 0),
    cobrado: pagosValidos.reduce((s, p) => s + Number(p.monto), 0),
    aCobrar: emitidos.reduce((s, r) => s + Math.max(Number(r.total) - Number(r.pagado), 0), 0),
  };
  return { tot, tipos, clientes, materiales, cobros, equipos: Object.values(porEquipo), emitidos, anulados };
}

function armarExcel(datos, b, { desde, hasta, titulo, cfg }) {
  const pv = cfg.remito_punto_venta || "0001";
  const f = (iso) => (iso ? new Date(iso) : null);
  const fd = (d) => (d ? new Date(d + "T12:00:00") : null);

  // ---- Resumen
  const R = [];
  const fila = (...c) => R.push(c);
  fila({ v: `${cfg.empresa_nombre || "LT Hormigones"} · Balance de planta`, s: "titulo" });
  fila(`Período: ${titulo} (${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")})`);
  fila(`Generado el ${new Date().toLocaleString("es-AR")}`);
  fila();
  fila({ v: "HORMIGÓN", s: "subtitulo" });
  fila({ v: "Remitos emitidos", s: "negrita" }, { v: b.tot.remitos, s: "entero" });
  fila({ v: "Remitos anulados", s: "negrita" }, { v: b.tot.anulados, s: "entero" });
  fila({ v: "m³ despachados", s: "negrita" }, { v: r1(b.tot.m3), s: "decimal" });
  fila({ v: "Total vendido", s: "negrita" }, { v: r2(b.tot.vendido), s: "moneda" });
  fila({ v: "Cobrado en el período", s: "negrita" }, { v: r2(b.tot.cobrado), s: "moneda" });
  fila({ v: "Pendiente de cobro de estos remitos", s: "negrita" }, { v: r2(b.tot.aCobrar), s: "moneda" });
  fila();
  fila({ v: "VENTAS POR TIPO DE HORMIGÓN", s: "subtitulo" });
  fila(...["Tipo", "Remitos", "m³", "Total vendido", "Cobrado", "% de los m³"].map((v) => ({ v, s: "encabezado" })));
  for (const t of b.tipos)
    fila(t.tipo, { v: t.remitos, s: "entero" }, { v: r1(t.m3), s: "decimal" }, { v: r2(t.total), s: "moneda" }, { v: r2(t.pagado), s: "moneda" }, { v: b.tot.m3 ? r1((t.m3 / b.tot.m3) * 100) : 0, s: "decimal" });
  fila({ v: "Total", s: "totalTexto" }, { v: b.tot.remitos, s: "totalEntero" }, { v: r1(b.tot.m3), s: "totalDecimal" }, { v: r2(b.tot.vendido), s: "totalMoneda" }, { v: r2(b.tipos.reduce((s, t) => s + t.pagado, 0)), s: "totalMoneda" }, { v: b.tot.m3 ? 100 : 0, s: "totalDecimal" });
  fila();
  fila({ v: "BALANCE DE MATERIALES", s: "subtitulo" });
  fila(...["Depósito", "Unidad", "Stock al inicio", "Ingresos", "Consumo (remitos)", "Devoluciones (anulados)", "Ajustes por medición", "Stock al cierre"].map((v) => ({ v, s: "encabezado" })));
  for (const m of b.materiales)
    fila(m.nombre, m.unidad, ...[m.inicial, m.ingresos, m.consumos, m.devoluciones, m.ajustes, m.final].map((v) => ({ v: r1(v), s: "decimal" })));
  const cem = b.materiales.filter((m) => m.unidad === "kg" && m.id.startsWith("silo"));
  if (cem.length)
    fila({ v: "Cemento (3 silos)", s: "totalTexto" }, { v: "kg", s: "totalTexto" }, ...["inicial", "ingresos", "consumos", "devoluciones", "ajustes", "final"].map((k) => ({ v: r1(cem.reduce((s, m) => s + m[k], 0)), s: "totalDecimal" })));
  fila();
  fila({ v: "COBROS DEL PERÍODO", s: "subtitulo" });
  fila(...["Medio de pago", "Cantidad", "Monto"].map((v) => ({ v, s: "encabezado" })));
  for (const c of b.cobros) fila(c.medio, { v: c.cantidad, s: "entero" }, { v: r2(c.monto), s: "moneda" });
  fila({ v: "Total", s: "totalTexto" }, { v: b.cobros.reduce((s, c) => s + c.cantidad, 0), s: "totalEntero" }, { v: r2(b.tot.cobrado), s: "totalMoneda" });
  if (b.equipos.length) {
    fila();
    fila({ v: "MOVIMIENTO DE SUELOS", s: "subtitulo" });
    fila(...["Equipo", "Partes", "Horas", "Viajes"].map((v) => ({ v, s: "encabezado" })));
    for (const e of b.equipos) fila(e.equipo, { v: e.partes, s: "entero" }, { v: r1(e.horas), s: "decimal" }, { v: e.viajes, s: "entero" });
  }
  const resumen = { nombre: "Resumen", anchos: [36, 14, 16, 16, 18, 22, 20, 16], filas: R };

  // ---- Remitos (todos, con anulados marcados)
  const remitos = hojaTabla(
    "Remitos",
    [
      { titulo: "N° remito", ancho: 16 }, { titulo: "Fecha", ancho: 17, s: "fechaHora" }, { titulo: "Estado", ancho: 10 },
      { titulo: "Cliente", ancho: 30 }, { titulo: "CUIT/DNI", ancho: 15 }, { titulo: "Obra", ancho: 30 }, { titulo: "Tipo", ancho: 9 },
      { titulo: "m³", ancho: 7, s: "decimal" }, { titulo: "Precio m³", ancho: 14, s: "moneda" }, { titulo: "Total", ancho: 15, s: "moneda" },
      { titulo: "Pagado", ancho: 15, s: "moneda" }, { titulo: "Pago", ancho: 22 }, { titulo: "Pedido N°", ancho: 10, s: "entero" },
      { titulo: "Mixer", ancho: 12 }, { titulo: "Chofer", ancho: 20 }, { titulo: "Bomba", ancho: 24 }, { titulo: "Silo", ancho: 8 },
      { titulo: "Cemento (kg)", ancho: 13, s: "decimal" }, ...Object.values(MAT_COL).map((t) => ({ titulo: t, ancho: 14, s: "decimal" })),
      { titulo: "Emitido por", ancho: 18 }, { titulo: "Observaciones", ancho: 30 }, { titulo: "Motivo anulación", ancho: 26 },
    ],
    datos.remitos.map((r) => {
      const cons = r.consumo || {};
      return [
        numeroRemito(r.numero, pv), f(r.fecha), r.estado === "anulado" ? "ANULADO" : "Emitido", r.cliente_nombre, r.cliente_cuit,
        r.obra_direccion, r.formula_nombre, Number(r.m3), Number(r.precio_m3), Number(r.total), Number(r.pagado),
        r.pago_estado === "pagado" ? `Pagado (${(r.medios_pago || "").split(", ").map((m) => MEDIOS[m]?.split(" ")[0] || m).join(" + ")})` : r.pago_estado === "pendiente" ? "A cobrar" : r.pago_estado,
        r.pedido_id, r.vehiculo_dominio, r.chofer_nombre, r.bomba_nombre, (r.silo_id || "").replace("silo", "Silo "),
        cons[r.silo_id] ?? null, ...Object.keys(MAT_COL).map((k) => cons[k] ?? null), r.creado_por_nombre, r.nota, r.motivo_anulacion,
      ];
    })
  );

  const clientes = hojaTabla(
    "Ventas por cliente",
    [
      { titulo: "Cliente", ancho: 34 }, { titulo: "Remitos", ancho: 10, s: "entero" }, { titulo: "m³", ancho: 10, s: "decimal" },
      { titulo: "Total vendido", ancho: 16, s: "moneda" }, { titulo: "Cobrado en el período", ancho: 20, s: "moneda" }, { titulo: "Saldo actual de la cuenta", ancho: 22, s: "moneda" },
    ],
    b.clientes.map((c) => [c.cliente, c.remitos, r1(c.m3), r2(c.total), r2(c.cobrado), r2(c.saldo)])
  );

  const d1 = new Date(hasta + "T23:59:59.999").toISOString();
  const TIPOS = { ingreso: "Ingreso", consumo: "Consumo", ajuste: "Ajuste", anulacion: "Devolución" };
  const movimientos = hojaTabla(
    "Movimientos de stock",
    [
      { titulo: "Fecha", ancho: 17, s: "fechaHora" }, { titulo: "Depósito", ancho: 20 }, { titulo: "Tipo", ancho: 12 },
      { titulo: "Cantidad", ancho: 13, s: "decimal" }, { titulo: "Unidad", ancho: 8 }, { titulo: "Remito N°", ancho: 16 },
      { titulo: "Detalle", ancho: 34 }, { titulo: "Usuario", ancho: 18 },
    ],
    datos.movimientos
      .filter((m) => m.creado_en <= d1)
      .map((m) => [f(m.creado_en), m.material_nombre, TIPOS[m.tipo] || m.tipo, Number(m.cantidad), m.unidad, m.remito_numero ? numeroRemito(m.remito_numero, pv) : null, m.nota, m.usuario_nombre])
  );

  const pagos = hojaTabla(
    "Cobros",
    [
      { titulo: "Fecha", ancho: 17, s: "fechaHora" }, { titulo: "Cliente", ancho: 30 }, { titulo: "Remito N°", ancho: 16 },
      { titulo: "Medio", ancho: 18 }, { titulo: "Monto", ancho: 15, s: "moneda" }, { titulo: "Referencia", ancho: 20 },
      { titulo: "Confirmó", ancho: 18 }, { titulo: "Estado", ancho: 10 }, { titulo: "Anuló / motivo", ancho: 30 },
    ],
    datos.pagos.map((p) => [
      f(p.fecha), p.cliente_nombre, p.remito_numero ? numeroRemito(p.remito_numero, pv) : "A cuenta", MEDIOS[p.medio] || p.medio,
      Number(p.monto), p.referencia, p.confirmado_por_nombre, p.anulado ? "ANULADO" : "Válido",
      p.anulado ? `${p.anulado_por_nombre || ""}: ${p.motivo_anulacion || ""}` : null,
    ])
  );

  const suelos = hojaTabla(
    "Movimiento de suelos",
    [
      { titulo: "Fecha", ancho: 12, s: "fecha" }, { titulo: "Equipo", ancho: 30 }, { titulo: "Dominio", ancho: 10 }, { titulo: "Operador", ancho: 20 },
      { titulo: "Cliente", ancho: 26 }, { titulo: "Obra", ancho: 26 }, { titulo: "Tarea", ancho: 28 }, { titulo: "Horas", ancho: 8, s: "decimal" },
      { titulo: "Viajes", ancho: 8, s: "entero" }, { titulo: "Nota", ancho: 26 },
    ],
    datos.suelos.map((t) => [fd(t.fecha), t.vehiculo_nombre, t.vehiculo_dominio, t.personal_nombre, t.cliente_nombre, t.obra, t.tarea, t.horas != null ? Number(t.horas) : null, t.viajes, t.nota])
  );

  return crearXlsx([resumen, remitos, clientes, movimientos, pagos, suelos]);
}

export async function render(el, ctx, { query }) {
  const hoy = hoyISO();
  const mes = query.get("mes") || hoy.slice(0, 7);
  let desde = query.get("desde");
  let hasta = query.get("hasta");
  if (!desde || !hasta) {
    const [y, m] = mes.split("-").map(Number);
    desde = `${mes}-01`;
    hasta = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }
  const personalizado = query.has("desde");
  const [y, m] = desde.split("-").map(Number);
  const titulo = personalizado ? "período personalizado" : `${MESES[m - 1]} ${y}`;

  const datos = await ctx.api.reportes.periodo({ desde, hasta });
  const b = calcularBalance(datos, desde, hasta);

  el.innerHTML = `
    <div class="barra">
      ${campo("Mes", `<input type="month" id="mes" value="${personalizado ? "" : mes}">`)}
      ${campo("o desde", `<input type="date" id="desde" value="${desde}">`)}
      ${campo("hasta", `<input type="date" id="hasta" value="${hasta}">`)}
      <span class="esp"></span>
      <button class="btn btn-primary btn-big" id="excel">${icon("instalar")} Descargar Excel</button>
    </div>
    <p class="muted" style="margin-top:0">Balance de <b style="color:var(--texto)">${esc(titulo)}</b>. El Excel trae este resumen y, en hojas aparte, todos los remitos, ventas por cliente, movimientos de stock, cobros y partes de movimiento de suelos.</p>

    <div class="grid g4">
      <div class="kpi"><span>Hormigón despachado</span><b>${n1(b.tot.m3)} m³</b><small>${b.tot.remitos} remitos${b.tot.anulados ? ` · ${b.tot.anulados} anulados` : ""}</small></div>
      <div class="kpi"><span>Total vendido</span><b style="font-size:22px">${$(b.tot.vendido)}</b></div>
      <div class="kpi"><span>Cobrado en el período</span><b style="font-size:22px">${$(b.tot.cobrado)}</b></div>
      <div class="kpi" style="border-left-color:${b.tot.aCobrar > 0 ? "var(--warn)" : "var(--ok)"}"><span>A cobrar de estos remitos</span><b style="font-size:22px">${$(b.tot.aCobrar)}</b></div>
    </div>

    <div class="seccion"><h2>Ventas por tipo de hormigón</h2>
      ${b.tipos.length ? `<div class="tabla-wrap"><table><thead><tr><th>Tipo</th><th class="num">Remitos</th><th class="num">m³</th><th class="num">Total vendido</th><th class="num">% de los m³</th></tr></thead><tbody>
      ${b.tipos.map((t) => `<tr><td><b>${esc(t.tipo)}</b></td><td class="num">${t.remitos}</td><td class="num">${n1(t.m3)}</td><td class="num">${$(t.total)}</td>
        <td class="num"><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><span class="nivel" style="width:90px;margin:0"><i style="width:${b.tot.m3 ? (t.m3 / b.tot.m3) * 100 : 0}%"></i></span>${n0(b.tot.m3 ? (t.m3 / b.tot.m3) * 100 : 0)}%</div></td></tr>`).join("")}
      <tr><td><b>Total</b></td><td class="num"><b>${b.tot.remitos}</b></td><td class="num"><b>${n1(b.tot.m3)}</b></td><td class="num"><b>${$(b.tot.vendido)}</b></td><td></td></tr>
      </tbody></table></div>` : vacio("No hubo remitos en este período.")}
    </div>

    <div class="seccion"><h2>Balance de materiales <span class="cnt">· entradas y salidas de cada depósito</span></h2>
      <div class="tabla-wrap"><table><thead><tr><th>Depósito</th><th class="num">Al inicio</th><th class="num">+ Ingresos</th><th class="num">− Consumo</th><th class="num">+ Devoluciones</th><th class="num">± Ajustes</th><th class="num">Al cierre</th></tr></thead><tbody>
      ${b.materiales.map((x) => `<tr><td><b>${esc(x.nombre)}</b></td>${[x.inicial, x.ingresos, x.consumos, x.devoluciones, x.ajustes, x.final].map((v, i) => `<td class="num ${i === 5 ? "" : "muted"}" ${i === 5 ? 'style="font-weight:700"' : ""}>${v ? n0(v) : "—"} ${v ? x.unidad : ""}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <p class="ayuda">Stock al inicio + ingresos − consumo + devoluciones ± ajustes = stock al cierre. Los ajustes son las correcciones por medición en planta.</p>
    </div>

    <div class="grid g2 seccion">
      <div><h2 style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--amarillo);margin-bottom:12px">Cobros por medio</h2>
        <div class="tabla-wrap"><table><tbody>${b.cobros.map((c) => `<tr><td>${c.medio}</td><td class="num">${c.cantidad}</td><td class="num"><b>${$(c.monto)}</b></td></tr>`).join("")}
        <tr><td><b>Total</b></td><td class="num">${b.cobros.reduce((s, c) => s + c.cantidad, 0)}</td><td class="num"><b>${$(b.tot.cobrado)}</b></td></tr></tbody></table></div></div>
      <div><h2 style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--amarillo);margin-bottom:12px">Clientes que más compraron</h2>
        ${b.clientes.length ? `<div class="tabla-wrap"><table><tbody>${b.clientes.slice(0, 8).map((c) => `<tr><td>${esc(c.cliente)}</td><td class="num">${n1(c.m3)} m³</td><td class="num"><b>${$(c.total)}</b></td></tr>`).join("")}</tbody></table></div>` : vacio("Sin ventas.")}</div>
    </div>

    ${b.equipos.length ? `<div class="seccion"><h2>Movimiento de suelos</h2><div class="tabla-wrap"><table><thead><tr><th>Equipo</th><th class="num">Partes</th><th class="num">Horas</th><th class="num">Viajes</th></tr></thead><tbody>
      ${b.equipos.map((e) => `<tr><td>${esc(e.equipo)}</td><td class="num">${e.partes}</td><td class="num">${n1(e.horas)}</td><td class="num">${e.viajes || "—"}</td></tr>`).join("")}</tbody></table></div></div>` : ""}`;

  el.querySelector("#mes").onchange = (e) => e.target.value && (location.hash = "#/reportes?mes=" + e.target.value);
  const rango = () => {
    const d = el.querySelector("#desde").value, h = el.querySelector("#hasta").value;
    if (d && h && d <= h) location.hash = `#/reportes?desde=${d}&hasta=${h}`;
  };
  el.querySelector("#desde").onchange = el.querySelector("#hasta").onchange = rango;
  el.querySelector("#excel").onclick = () => {
    try {
      const blob = armarExcel(datos, b, { desde, hasta, titulo, cfg: ctx.cfg });
      const nombre = personalizado ? `LT-balance-${desde}-a-${hasta}.xlsx` : `LT-balance-${mes}.xlsx`;
      descargar(blob, nombre);
      toast("Excel descargado.");
    } catch (ex) {
      toast("No se pudo generar el Excel: " + errorMsg(ex), "error");
    }
  };
  // para pruebas automáticas
  el._armarExcel = () => armarExcel(datos, b, { desde, hasta, titulo, cfg: ctx.cfg });
}
