// MODO DEMOSTRACIÓN: misma interfaz que api-supabase.js, con datos de prueba
// guardados en este navegador. Sirve para conocer la app antes de conectarla.
export const demo = true;

const KEY = "lt-demo-v1";
const USUARIOS_DEMO = [
  { id: "u-admin", usuario: "admin", nombre: "Administrador demo", rol: "admin", activo: true, password: "admin" },
  { id: "u-op", usuario: "operador", nombre: "Operador demo", rol: "operador", activo: true, password: "operador" },
];

function semilla() {
  const now = Date.now();
  const H = (h) => new Date(now - h * 3600e3).toISOString();
  const db = {
    seq: 100,
    configuracion: {
      empresa_nombre: "LOGÍSTICA TRANSPORTADORA S.A.",
      empresa_linea2: "LT Hormigones",
      empresa_cuit: "30-00000000-0",
      empresa_direccion: "Dirección de la planta",
      empresa_telefono: "",
      remito_punto_venta: "0001",
      remito_numero_inicial: "1",
    },
    perfiles: USUARIOS_DEMO.map((u) => ({ ...u })),
    materiales: [
      { id: "silo1", nombre: "Silo de cemento 1", tipo: "cemento", unidad: "kg", capacidad: 45000, stock: 9800, minimo: 8000, orden: 1 },
      { id: "silo2", nombre: "Silo de cemento 2", tipo: "cemento", unidad: "kg", capacidad: 75000, stock: 61000, minimo: 8000, orden: 2 },
      { id: "silo3", nombre: "Silo de cemento 3", tipo: "cemento", unidad: "kg", capacidad: 75000, stock: 72500, minimo: 8000, orden: 3 },
      { id: "arena", nombre: "Arena", tipo: "arido", unidad: "kg", capacidad: 300000, stock: 182000, minimo: 30000, orden: 4 },
      { id: "piedra620", nombre: "Piedra 6/20", tipo: "arido", unidad: "kg", capacidad: 300000, stock: 214000, minimo: 30000, orden: 5 },
      { id: "piedra06", nombre: "Piedra 0/6", tipo: "arido", unidad: "kg", capacidad: 300000, stock: 96000, minimo: 30000, orden: 6 },
      { id: "agua", nombre: "Tanque de agua", tipo: "agua", unidad: "L", capacidad: 10000, stock: 6200, minimo: 2000, orden: 7 },
    ],
    movimientos_stock: [],
    formulas: [
      ["H4", 120, 1050, 600, 340, 160], ["H8", 140, 950, 600, 340, 160], ["H13", 210, 900, 500, 440, 175],
      ["H15", 230, 820, 350, 600, 170], ["H17", 250, 820, 350, 600, 175], ["H21", 290, 850, 400, 700, 170],
      ["H25", 360, 880, 400, 490, 150], ["H30", 370, 873, 300, 700, 154], ["H35", 395, 873, 429, 424, 178],
      ["Mortero", 300, 0, 1300, 500, 190],
    ].map(([nombre, c, p1, p2, a, w], i) => ({
      id: i + 1, nombre, cemento_kg: c, piedra620_kg: p1, piedra06_kg: p2, arena_kg: a, agua_l: w,
      precio_m3: 95000 + c * 150, activa: true, orden: i + 1,
    })),
    clientes: [
      { id: 1, nombre: "Constructora del Sur S.R.L.", cuit: "30-71234567-8", telefono: "11 5555-1020", direccion: "Av. San Martín 1450", activo: true },
      { id: 2, nombre: "Martínez Obras", cuit: "20-28765432-1", telefono: "11 4444-8890", direccion: "Barrio Los Álamos, lote 12", activo: true },
      { id: 3, nombre: "Municipalidad - Obras Públicas", cuit: "", telefono: "", direccion: "", activo: true },
    ],
    personal: [
      { id: 1, nombre: "Carlos Gómez", funcion: "chofer", telefono: "11 3333-1111", venc_licencia: "2027-03-10", activo: true },
      { id: 2, nombre: "Diego Ruiz", funcion: "chofer", telefono: "11 3333-2222", venc_licencia: "2026-12-05", activo: true },
      { id: 3, nombre: "Pablo Sosa", funcion: "operador", telefono: "", venc_licencia: null, activo: true },
      { id: 4, nombre: "Luis Ferreyra", funcion: "chofer y operador", telefono: "", venc_licencia: "2028-01-20", activo: true },
    ],
    vehiculos: [
      ["hormigon", "mixer", "Camión mixer", "Volvo", "VM 270 8X4 R", 2018, "AC571CR", 10, "10 m³"],
      ["hormigon", "mixer", "Camión mixer", "Volvo", "VM 270 6X4 R", 2017, "AC263GU", 8, "8 m³"],
      ["hormigon", "mixer", "Semitrompo hormigonero", "DC-Indumix", "03-MTIS", 2017, "AB212FY", 10, "10 m³"],
      ["hormigon", "mixer", "Camión mixer", "Volvo", "723-VM 270 8X4 R", 2021, "AF000IQ", 10, "10 m³"],
      ["hormigon", "tolva", "Tolva carga cemento a granel", "Randon", "164-SR-SL-02+01", 2016, "AA731BS", null, "30 t"],
      ["hormigon", "bomba", "Bomba hormigonera de arrastre", "Putzmeister", "TK40", 2017, null, null, null],
      ["hormigon", "bomba", "Bomba hormigonera pluma", null, null, 2015, null, null, null],
      ["suelos", "equipo", "Retroexcavadora sobre oruga", "Link Belt", "210 X2", 2015, "CXD46"],
      ["suelos", "equipo", "Motoniveladora", "Caterpillar", "140H", 1997, null],
      ["suelos", "equipo", "Pala cargadora frontal", "SDLG", "LG946L", 2022, "FCE85"],
      ["suelos", "equipo", "Pala cargadora frontal", "SDLG", "L936H", 2022, "ESN88"],
      ["suelos", "equipo", "Compactador de suelo", "SDLG", "RS7120", 2018, null],
      ["suelos", "camion", "Camión regador", "Ford", "F-7000", 1977, "VSS839"],
      ["suelos", "equipo", "Cargadora retroexcavadora", "SDLG", "B876F", 2020, "EDT11"],
      ["suelos", "equipo", "Pala cargadora frontal", "SDLG", "L936", 2021, "EDT87"],
      ["aridos", "tractor", "Tractor con cabina dormitorio", "Volvo", "FH 420 6X2 T", 2021, "AF000IZ"],
      ["aridos", "semirremolque", "Batea semirremolque", "Randon", "25 SR BA 03", 2023, "AF693MK"],
      ["aridos", "tractor", "Tractor con cabina dormitorio", "Volkswagen", "Meteor 28.460", 2025, "AH513QO"],
      ["aridos", "semirremolque", "Batea semirremolque", "Randon", "12-SR.BA.02+01", 2019, "AE039AC"],
      ["aridos", "semirremolque", "Carretón semirremolque importado", "Randon", "SR.CT.03", 2013, "NBE174"],
      ["aridos", "camion", "Camión balancín volcador", "Volvo", "VM 330 6X4 R", 2018, "AD465XN"],
      ["aridos", "camion", "Camión balancín volcador", "Volvo", "FMX 460 8X4R", 2026, "AI057RC"],
      ["aridos", "semirremolque", "Carretón semirremolque importado", "Patronelli", "ACCG3E", 2020, "AC004KK"],
    ].map(([grupo, tipo, denominacion, marca, modelo, anio, dominio, capacidad_m3 = null, capacidad = null], i) => ({
      id: i + 1, grupo, tipo, denominacion, marca, modelo, anio, dominio, capacidad_m3, capacidad,
      estado: "disponible", personal_id: null, venc_revision: null, nota: null, activo: true, orden: i + 1,
    })),
    pedidos: [],
    remitos: [],
    pagos: [],
    trabajos_suelo: [],
  };
  db.vehiculos[0].personal_id = 1;
  db.vehiculos[3].personal_id = 2;
  db.vehiculos[1].estado = "taller";
  db.vehiculos[7].personal_id = 3;
  db.vehiculos[7].estado = "trabajando";
  db.vehiculos[9].personal_id = 4;
  db.pedidos.push(
    { id: 1, cliente_id: 1, obra_direccion: "Av. San Martín 1450 - Losa 2° piso", formula_id: 6, m3: 24, fecha_entrega: hoy(), hora: "08:00", requiere_bomba: true, estado: "pendiente", nota: "Llevar bomba pluma", creado_por: "u-admin", creado_en: H(30) },
    { id: 2, cliente_id: 2, obra_direccion: "Barrio Los Álamos, lote 12", formula_id: 4, m3: 6, fecha_entrega: hoy(), hora: "14:00", requiere_bomba: false, estado: "pendiente", nota: "", creado_por: "u-op", creado_en: H(20) }
  );
  db.trabajos_suelo.push({ id: 1, fecha: hoy(), vehiculo_id: 8, personal_id: 3, cliente_id: 3, obra: "Apertura de calle - B° Norte", tarea: "Excavación de zanja", horas: 6, viajes: null, nota: "", creado_por: "u-op", creado_en: H(2) });
  return db;
}

function hoy() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

let db;
try {
  db = JSON.parse(localStorage.getItem(KEY)) || null;
} catch {
  db = null;
}
let nuevo = false;
if (!db) {
  db = semilla();
  nuevo = true;
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
};
const id = () => ++db.seq;
const clone = (x) => JSON.parse(JSON.stringify(x));
const wait = (v) => new Promise((r) => setTimeout(() => r(clone(v)), 60));
let yo = null;
try {
  yo = JSON.parse(sessionStorage.getItem(KEY + "-yo"));
} catch {}

const activo = () => {
  if (!yo) throw new Error("Tu sesión venció. Volvé a ingresar.");
};
const admin = () => {
  activo();
  if (yo.rol !== "admin") throw new Error("Solo un administrador puede hacer esto.");
};
const passOk = (p) => db.perfiles.find((u) => u.id === yo.id)?.password === p;
const nombreDe = (uid) => db.perfiles.find((u) => u.id === uid)?.nombre ?? "";

function movimiento(material_id, cantidad, tipo, remito_id = null, nota = null) {
  db.movimientos_stock.push({ id: id(), material_id, cantidad, tipo, remito_id, nota, usuario_id: yo.id, creado_en: new Date().toISOString() });
  db.materiales.find((m) => m.id === material_id).stock += cantidad;
}

function insertarPago(cliente_id, remito_id, monto, medio, referencia) {
  if (!(monto > 0)) throw new Error("El monto debe ser mayor a cero.");
  if (!["contado", "transferencia", "deposito"].includes(medio)) throw new Error("Elegí cómo pagó: contado, transferencia o depósito.");
  const p = { id: id(), cliente_id, remito_id, monto: Math.round(monto * 100) / 100, medio, referencia: referencia || null, fecha: new Date().toISOString(), confirmado_por: yo.id, anulado: false };
  db.pagos.push(p);
  return p.id;
}

function vistaRemito(r) {
  const c = db.clientes.find((x) => x.id === r.cliente_id) || {};
  const v = db.vehiculos.find((x) => x.id === r.vehiculo_id);
  const b = db.vehiculos.find((x) => x.id === r.bomba_id);
  const ch = db.personal.find((x) => x.id === r.chofer_id);
  const ps = db.pagos.filter((p) => p.remito_id === r.id && !p.anulado);
  const pagado = ps.reduce((s, p) => s + p.monto, 0);
  return {
    ...r,
    cliente_nombre: c.nombre, cliente_cuit: c.cuit, cliente_telefono: c.telefono,
    vehiculo_dominio: v?.dominio, vehiculo_nombre: v?.denominacion, chofer_nombre: ch?.nombre, bomba_nombre: b?.denominacion,
    creado_por_nombre: nombreDe(r.creado_por), pagado, medios_pago: [...new Set(ps.map((p) => p.medio))].sort().join(", ") || null,
    pago_estado: r.estado === "anulado" ? "anulado" : r.total === 0 ? "sin precio" : pagado >= r.total ? "pagado" : pagado > 0 ? "parcial" : "pendiente",
  };
}
const vistaPago = (p) => ({
  ...p,
  cliente_nombre: db.clientes.find((c) => c.id === p.cliente_id)?.nombre,
  remito_numero: db.remitos.find((r) => r.id === p.remito_id)?.numero ?? null,
  confirmado_por_nombre: nombreDe(p.confirmado_por),
  anulado_por_nombre: p.anulado_por ? nombreDe(p.anulado_por) : null,
});

// Remitos de ejemplo
if (nuevo) {
  yo = db.perfiles[1];
  const r1 = emitirInterno({ cliente_id: 1, pedido_id: 1, formula_id: 6, m3: 8, silo_id: "silo2", vehiculo_id: 1, chofer_id: 1, bomba_id: 7, obra_direccion: "Av. San Martín 1450 - Losa 2° piso" });
  r1.fecha = new Date(Date.now() - 2.5 * 3600e3).toISOString();
  db.vehiculos[0].estado = "disponible";
  const r2 = emitirInterno({ cliente_id: 1, pedido_id: 1, formula_id: 6, m3: 10, silo_id: "silo2", vehiculo_id: 4, chofer_id: 2, obra_direccion: "Av. San Martín 1450 - Losa 2° piso" });
  r2.fecha = new Date(Date.now() - 0.8 * 3600e3).toISOString();
  insertarPago(1, r1.id, r1.total, "transferencia", "Op. 556677");
  yo = null;
  save();
}

function emitirInterno(p) {
  activo();
  const m3 = Number(p.m3);
  if (!(m3 > 0)) throw new Error("Indicá los m³ a entregar.");
  if (m3 > 20) throw new Error("Revisá los m³: un remito no puede superar 20 m³.");
  if (!p.cliente_id) throw new Error("Elegí el cliente.");
  const f = db.formulas.find((x) => x.id === Number(p.formula_id) && x.activa);
  if (!f) throw new Error("Elegí un tipo de hormigón válido.");
  const silo = p.silo_id || "silo1";
  const precio = yo.rol === "admin" ? (p.precio_m3 ?? f.precio_m3 ?? 0) : f.precio_m3;
  if (p.pago?.medio) {
    if (!(precio * m3 > 0)) throw new Error("El remito no tiene precio: no se puede registrar el pago.");
    if (!passOk(p.pago.password)) throw new Error("Contraseña incorrecta. El remito NO se emitió.");
  }
  const numero = Math.max(Number(db.configuracion.remito_numero_inicial) || 1, ...db.remitos.map((r) => r.numero + 1));
  const r1 = (x) => Math.round(x * 10) / 10;
  const consumo = { [silo]: r1(f.cemento_kg * m3), piedra620: r1(f.piedra620_kg * m3), piedra06: r1(f.piedra06_kg * m3), arena: r1(f.arena_kg * m3), agua: r1(f.agua_l * m3) };
  const r = {
    id: id(), numero, fecha: new Date().toISOString(), cliente_id: Number(p.cliente_id), obra_direccion: p.obra_direccion || null,
    pedido_id: p.pedido_id ? Number(p.pedido_id) : null, formula_id: f.id, formula_nombre: f.nombre, m3, precio_m3: precio,
    total: Math.round(m3 * precio * 100) / 100, silo_id: silo, vehiculo_id: p.vehiculo_id ? Number(p.vehiculo_id) : null,
    chofer_id: p.chofer_id ? Number(p.chofer_id) : null, bomba_id: p.bomba_id ? Number(p.bomba_id) : null, consumo,
    nota: p.nota || null, estado: "emitido", creado_por: yo.id,
  };
  db.remitos.push(r);
  for (const [k, v] of Object.entries(consumo)) if (v > 0) movimiento(k, -v, "consumo", r.id, `Remito N° ${numero}`);
  const veh = db.vehiculos.find((v) => v.id === r.vehiculo_id);
  if (veh) {
    veh.estado = "en_viaje";
    if (r.chofer_id) veh.personal_id = r.chofer_id;
  }
  const bomba = db.vehiculos.find((v) => v.id === r.bomba_id);
  if (bomba) bomba.estado = "trabajando";
  const ped = db.pedidos.find((x) => x.id === r.pedido_id);
  if (ped && ped.estado === "pendiente") {
    const ent = db.remitos.filter((x) => x.pedido_id === ped.id && x.estado === "emitido").reduce((s, x) => s + x.m3, 0);
    if (ent >= ped.m3) ped.estado = "completo";
  }
  if (p.pago?.medio) insertarPago(r.cliente_id, r.id, r.total, p.pago.medio, p.pago.referencia);
  return r;
}

export const auth = {
  async login(usuario, password) {
    const u = db.perfiles.find((x) => x.usuario === usuario.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error("Usuario o contraseña incorrectos.");
    if (!u.activo) throw new Error("Tu usuario está deshabilitado. Hablá con el administrador.");
    yo = u;
    try {
      sessionStorage.setItem(KEY + "-yo", JSON.stringify(u));
    } catch {}
    return wait(u);
  },
  async logout() {
    yo = null;
    try {
      sessionStorage.removeItem(KEY + "-yo");
    } catch {}
  },
  async perfil() {
    return yo ? clone(db.perfiles.find((u) => u.id === yo.id)) : null;
  },
};

export const reiniciarDemo = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};

export const config = async () => wait(db.configuracion);
export const guardarConfig = async (o) => {
  admin();
  Object.assign(db.configuracion, o);
  save();
};

export const materiales = {
  list: async () => wait(db.materiales),
  guardar: async (mid, cambios) => {
    admin();
    const m = db.materiales.find((x) => x.id === mid);
    for (const k of ["nombre", "capacidad", "minimo"]) if (cambios[k] !== undefined) m[k] = cambios[k];
    save();
  },
  ingreso: async (mid, cant, nota) => {
    activo();
    if (!(cant > 0)) throw new Error("La cantidad debe ser mayor a cero.");
    movimiento(mid, cant, "ingreso", null, nota);
    save();
  },
  ajuste: async (mid, real, nota) => {
    activo();
    if (real === null || real < 0) throw new Error("Indicá la cantidad real medida.");
    const m = db.materiales.find((x) => x.id === mid);
    if (real !== m.stock) movimiento(mid, real - m.stock, "ajuste", null, nota || "Medición en planta");
    save();
  },
  movimientos: async ({ material, limite = 200 } = {}) =>
    wait(
      db.movimientos_stock
        .filter((m) => !material || m.material_id === material)
        .slice(-limite)
        .reverse()
        .map((m) => {
          const mt = db.materiales.find((x) => x.id === m.material_id);
          return { ...m, material_nombre: mt.nombre, unidad: mt.unidad, usuario_nombre: nombreDe(m.usuario_id), remito_numero: db.remitos.find((r) => r.id === m.remito_id)?.numero ?? null };
        })
    ),
};

const crud = (tabla, ordenar = (a, b) => String(a.nombre).localeCompare(b.nombre), soloAdminAlta = false, soloAdminEdit = false) => ({
  list: async () => wait([...db[tabla]].sort(ordenar)),
  guardar: async (o) => {
    activo();
    if (o.id) {
      if (soloAdminEdit) admin();
      const x = db[tabla].find((r) => r.id === o.id);
      Object.assign(x, o);
      save();
      return wait(x);
    }
    if (soloAdminAlta) admin();
    const x = { activo: true, ...o, id: id() };
    db[tabla].push(x);
    save();
    return wait(x);
  },
});

export const formulas = crud("formulas", (a, b) => a.orden - b.orden, true, true);
export const clientes = crud("clientes");
export const personal = crud("personal", undefined, true);
export const vehiculos = {
  ...crud("vehiculos", (a, b) => a.orden - b.orden, true),
  estado: async (vid, estado, personal_id) => {
    activo();
    const v = db.vehiculos.find((x) => x.id === vid);
    if (estado !== undefined) v.estado = estado;
    if (personal_id !== undefined) v.personal_id = personal_id;
    save();
  },
};

export const cuentas = {
  list: async () =>
    wait(
      [...db.clientes]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((c) => {
          const rs = db.remitos.filter((r) => r.cliente_id === c.id && r.estado === "emitido");
          const tr = rs.reduce((s, r) => s + r.total, 0);
          const tp = db.pagos.filter((p) => p.cliente_id === c.id && !p.anulado).reduce((s, p) => s + p.monto, 0);
          return { ...c, total_remitos: tr, total_pagos: tp, saldo: tr - tp, ultimo_remito: rs.map((r) => r.fecha).sort().pop() ?? null };
        })
    ),
  detalle: async (cid) =>
    wait({
      remitos: db.remitos.filter((r) => r.cliente_id === cid).map(vistaRemito).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      pagos: db.pagos.filter((p) => p.cliente_id === cid).map(vistaPago).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }),
};

export const pedidos = {
  list: async ({ estado, desde } = {}) =>
    wait(
      db.pedidos
        .filter((p) => (!estado || p.estado === estado) && (!desde || p.fecha_entrega >= desde))
        .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega) || a.id - b.id)
        .map((p) => {
          const f = db.formulas.find((x) => x.id === p.formula_id);
          const ent = db.remitos.filter((r) => r.pedido_id === p.id && r.estado === "emitido").reduce((s, r) => s + r.m3, 0);
          return { ...p, cliente_nombre: db.clientes.find((c) => c.id === p.cliente_id)?.nombre, formula_nombre: f?.nombre, formula_precio: f?.precio_m3, m3_entregados: ent, m3_pendientes: Math.max(p.m3 - ent, 0) };
        })
    ),
  guardar: crud("pedidos").guardar,
};

export const remitos = {
  list: async ({ desde, hasta, cliente, limite = 300 } = {}) =>
    wait(
      db.remitos
        .filter((r) => (!desde || r.fecha >= new Date(desde + "T00:00:00").toISOString()) && (!hasta || r.fecha <= new Date(hasta + "T23:59:59").toISOString()) && (!cliente || r.cliente_id === Number(cliente)))
        .sort((a, b) => b.numero - a.numero)
        .slice(0, limite)
        .map(vistaRemito)
    ),
  get: async (rid) => wait(vistaRemito(db.remitos.find((r) => r.id === rid))),
  emitir: async (p) => {
    const snapshot = JSON.stringify(db);
    try {
      const r = emitirInterno(p);
      save();
      return wait(r);
    } catch (e) {
      db = JSON.parse(snapshot);
      throw e;
    }
  },
  anular: async (rid, motivo, password) => {
    admin();
    if (!passOk(password)) throw new Error("Contraseña incorrecta.");
    if (!motivo) throw new Error("Escribí el motivo de la anulación.");
    const r = db.remitos.find((x) => x.id === rid);
    if (!r || r.estado === "anulado") throw new Error("El remito no existe o ya estaba anulado.");
    if (db.pagos.some((p) => p.remito_id === rid && !p.anulado)) throw new Error("Ese remito tiene pagos registrados. Anulá primero el pago.");
    Object.assign(r, { estado: "anulado", anulado_por: yo.id, anulado_en: new Date().toISOString(), motivo_anulacion: motivo });
    for (const [k, v] of Object.entries(r.consumo)) if (v > 0) movimiento(k, v, "anulacion", r.id, `Anulación remito N° ${r.numero}`);
    const ped = db.pedidos.find((x) => x.id === r.pedido_id);
    if (ped && ped.estado === "completo") ped.estado = "pendiente";
    save();
  },
};

export const pagos = {
  confirmar: async ({ cliente_id, remito_id, monto, medio, referencia, password }) => {
    activo();
    if (!passOk(password)) throw new Error("Contraseña incorrecta. El pago NO se registró.");
    const pid = insertarPago(Number(cliente_id), remito_id ? Number(remito_id) : null, Number(monto), medio, referencia);
    save();
    return pid;
  },
  anular: async (pid, motivo, password) => {
    admin();
    if (!passOk(password)) throw new Error("Contraseña incorrecta.");
    if (!motivo) throw new Error("Escribí el motivo de la anulación.");
    const p = db.pagos.find((x) => x.id === pid);
    if (!p || p.anulado) throw new Error("El pago no existe o ya estaba anulado.");
    Object.assign(p, { anulado: true, anulado_por: yo.id, anulado_en: new Date().toISOString(), motivo_anulacion: motivo });
    save();
  },
  list: async ({ desde } = {}) =>
    wait(db.pagos.filter((p) => !desde || p.fecha >= new Date(desde + "T00:00:00").toISOString()).map(vistaPago).sort((a, b) => b.fecha.localeCompare(a.fecha))),
};

export const suelos = {
  list: async ({ desde, hasta } = {}) =>
    wait(
      db.trabajos_suelo
        .filter((t) => (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta))
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
        .map((t) => {
          const v = db.vehiculos.find((x) => x.id === t.vehiculo_id);
          return { ...t, vehiculo_nombre: v?.denominacion, vehiculo_marca: v?.marca, vehiculo_modelo: v?.modelo, vehiculo_dominio: v?.dominio, personal_nombre: db.personal.find((p) => p.id === t.personal_id)?.nombre, cliente_nombre: db.clientes.find((c) => c.id === t.cliente_id)?.nombre };
        })
    ),
  crear: async (o) => {
    activo();
    const t = { ...o, id: id(), creado_por: yo.id, creado_en: new Date().toISOString() };
    db.trabajos_suelo.push(t);
    save();
    return wait(t);
  },
  borrar: async (tid) => {
    admin();
    db.trabajos_suelo = db.trabajos_suelo.filter((t) => t.id !== tid);
    save();
  },
};

export const usuarios = {
  list: async () => wait(db.perfiles.map(({ password, ...u }) => u)),
  crear: async ({ usuario, nombre, password, rol }) => {
    admin();
    usuario = (usuario || "").toLowerCase().trim();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw new Error("El usuario debe tener entre 3 y 30 letras o números, sin espacios ni acentos.");
    if ((password || "").length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
    if (db.perfiles.some((u) => u.usuario === usuario)) throw new Error("Ese usuario ya existe.");
    db.perfiles.push({ id: "u-" + id(), usuario, nombre, rol, activo: true, password });
    save();
  },
  guardar: async (uid, cambios) => {
    admin();
    const u = db.perfiles.find((x) => x.id === uid);
    const quedan = db.perfiles.filter((x) => x.id !== uid && x.rol === "admin" && x.activo).length;
    if (u.rol === "admin" && ((cambios.rol && cambios.rol !== "admin") || cambios.activo === false) && !quedan)
      throw new Error("Tiene que quedar al menos un administrador activo.");
    Object.assign(u, cambios);
    save();
  },
  password: async (uid, password) => {
    if (yo.rol !== "admin" && uid !== yo.id) throw new Error("Solo un administrador puede cambiar la contraseña de otra persona.");
    if ((password || "").length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
    db.perfiles.find((x) => x.id === uid).password = password;
    save();
  },
};

export const reportes = {
  async periodo({ desde, hasta }) {
    activo();
    const d0 = new Date(desde + "T00:00:00").toISOString();
    const d1 = new Date(hasta + "T23:59:59.999").toISOString();
    const movs = await materiales.movimientos({ limite: 100000 });
    return {
      remitos: db.remitos.filter((r) => r.fecha >= d0 && r.fecha <= d1).sort((a, b) => a.numero - b.numero).map(vistaRemito),
      movimientos: movs.filter((m) => m.creado_en >= d0).reverse(),
      pagos: db.pagos.filter((p) => p.fecha >= d0 && p.fecha <= d1).map(vistaPago).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      suelos: (await suelos.list({ desde, hasta })).reverse(),
      materiales: clone(db.materiales),
      cuentas: await cuentas.list(),
    };
  },
};
