// Acceso a datos real (Supabase). Misma interfaz que api-demo.js.
const CFG = window.LT_CONFIG;
const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const ok = ({ data, error }) => {
  if (error) throw new Error(traducir(error));
  return data;
};
function traducir(error) {
  const m = error.message || "";
  if (/Invalid login credentials/i.test(m)) return "Usuario o contraseña incorrectos.";
  if (/row-level security|permission denied/i.test(m)) return "No tenés permiso para hacer esto.";
  return m;
}
const email = (usuario) => (usuario.includes("@") ? usuario : `${usuario.toLowerCase()}@${CFG.DOMINIO_USUARIOS}`);
const sinUndef = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

let perfilActual = null;

export const demo = false;

export const auth = {
  async login(usuario, password) {
    ok(await sb.auth.signInWithPassword({ email: email(usuario.trim()), password }));
    return auth.perfil(true);
  },
  async logout() {
    perfilActual = null;
    await sb.auth.signOut();
  },
  async perfil(refrescar = false) {
    if (perfilActual && !refrescar) return perfilActual;
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const p = ok(await sb.from("perfiles").select("*").eq("id", data.session.user.id).maybeSingle());
    if (!p || !p.activo) {
      await sb.auth.signOut();
      throw new Error("Tu usuario está deshabilitado. Hablá con el administrador.");
    }
    perfilActual = p;
    return p;
  },
};

export async function config() {
  const rows = ok(await sb.from("configuracion").select("*"));
  return Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
}
export async function guardarConfig(obj) {
  ok(await sb.from("configuracion").upsert(Object.entries(obj).map(([clave, valor]) => ({ clave, valor: valor ?? "" }))));
}

// ----------------------------------------------------------- stock
export const materiales = {
  list: async () => ok(await sb.from("materiales").select("*").order("orden")),
  guardar: async (id, { nombre, capacidad, minimo }) =>
    ok(await sb.from("materiales").update(sinUndef({ nombre, capacidad, minimo })).eq("id", id)),
  ingreso: async (id, cantidad, nota) => ok(await sb.rpc("registrar_ingreso", { p_material_id: id, p_cantidad: cantidad, p_nota: nota })),
  ajuste: async (id, real, nota) => ok(await sb.rpc("ajustar_stock", { p_material_id: id, p_stock_real: real, p_nota: nota })),
  movimientos: async ({ material, limite = 200 } = {}) => {
    let q = sb.from("movimientos_stock_vista").select("*").order("id", { ascending: false }).limit(limite);
    if (material) q = q.eq("material_id", material);
    return ok(await q);
  },
};

// ----------------------------------------------------------- catálogos
const crud = (tabla, orden = "nombre") => ({
  list: async () => ok(await sb.from(tabla).select("*").order(orden)),
  guardar: async (o) => {
    const { id, ...rest } = o;
    if (id) return ok(await sb.from(tabla).update(rest).eq("id", id).select().single());
    return ok(await sb.from(tabla).insert(rest).select().single());
  },
});

export const formulas = crud("formulas", "orden");
export const clientes = crud("clientes");
export const personal = crud("personal");
export const vehiculos = {
  ...crud("vehiculos", "orden"),
  estado: async (id, estado, personal_id) =>
    ok(await sb.from("vehiculos").update(sinUndef({ estado, personal_id })).eq("id", id)),
};

export const cuentas = {
  list: async () => ok(await sb.from("cuentas_clientes").select("*").order("nombre")),
  detalle: async (clienteId) => {
    const [rem, pag] = await Promise.all([
      sb.from("remitos_vista").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }),
      sb.from("pagos_vista").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }),
    ]);
    return { remitos: ok(rem), pagos: ok(pag) };
  },
};

// ----------------------------------------------------------- pedidos
export const pedidos = {
  list: async ({ estado, desde } = {}) => {
    let q = sb.from("pedidos_vista").select("*").order("fecha_entrega").order("id");
    if (estado) q = q.eq("estado", estado);
    if (desde) q = q.gte("fecha_entrega", desde);
    return ok(await q);
  },
  guardar: crud("pedidos").guardar,
};

// ----------------------------------------------------------- remitos
export const remitos = {
  list: async ({ desde, hasta, cliente, limite = 300 } = {}) => {
    let q = sb.from("remitos_vista").select("*").order("numero", { ascending: false }).limit(limite);
    if (desde) q = q.gte("fecha", new Date(desde + "T00:00:00").toISOString());
    if (hasta) q = q.lte("fecha", new Date(hasta + "T23:59:59").toISOString());
    if (cliente) q = q.eq("cliente_id", cliente);
    return ok(await q);
  },
  get: async (id) => ok(await sb.from("remitos_vista").select("*").eq("id", id).single()),
  emitir: async (p) => ok(await sb.rpc("emitir_remito", { p })),
  anular: async (id, motivo, password) =>
    ok(await sb.rpc("anular_remito", { p_remito_id: id, p_motivo: motivo, p_password: password })),
};

export const pagos = {
  confirmar: async ({ cliente_id, remito_id, monto, medio, referencia, password }) =>
    ok(
      await sb.rpc("confirmar_pago", {
        p_cliente_id: cliente_id,
        p_remito_id: remito_id ?? null,
        p_monto: monto,
        p_medio: medio,
        p_referencia: referencia ?? null,
        p_password: password,
      })
    ),
  anular: async (id, motivo, password) => ok(await sb.rpc("anular_pago", { p_pago_id: id, p_motivo: motivo, p_password: password })),
  list: async ({ desde, limite = 300 } = {}) => {
    let q = sb.from("pagos_vista").select("*").order("fecha", { ascending: false }).limit(limite);
    if (desde) q = q.gte("fecha", new Date(desde + "T00:00:00").toISOString());
    return ok(await q);
  },
};

// ----------------------------------------------------------- suelos
export const suelos = {
  list: async ({ desde, hasta } = {}) => {
    let q = sb.from("trabajos_suelo_vista").select("*").order("fecha", { ascending: false }).order("id", { ascending: false });
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);
    return ok(await q);
  },
  crear: async (o) => ok(await sb.from("trabajos_suelo").insert(o).select().single()),
  borrar: async (id) => ok(await sb.from("trabajos_suelo").delete().eq("id", id)),
};

// ----------------------------------------------------------- usuarios
export const usuarios = {
  list: async () => ok(await sb.from("perfiles").select("*").order("nombre")),
  crear: async ({ usuario, nombre, password, rol }) =>
    ok(
      await sb.rpc("admin_crear_usuario", {
        p_usuario: usuario,
        p_nombre: nombre,
        p_password: password,
        p_rol: rol,
        p_dominio: CFG.DOMINIO_USUARIOS,
      })
    ),
  guardar: async (id, cambios) => ok(await sb.from("perfiles").update(cambios).eq("id", id)),
  password: async (id, password) => ok(await sb.rpc("admin_cambiar_password", { p_usuario_id: id, p_password: password })),
};

// ----------------------------------------------------------- reportes
// Trae todas las filas (Supabase devuelve como máximo 1000 por consulta).
async function todo(armar) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const filas = ok(await armar().range(i, i + 999));
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}
export const reportes = {
  async periodo({ desde, hasta }) {
    const d0 = new Date(desde + "T00:00:00").toISOString();
    const d1 = new Date(hasta + "T23:59:59.999").toISOString();
    const [remitos, movimientos, pagos, suelos, mats, cuentasCli] = await Promise.all([
      todo(() => sb.from("remitos_vista").select("*").gte("fecha", d0).lte("fecha", d1).order("numero")),
      // desde el inicio del período hasta hoy: sirve para calcular el stock al inicio y al cierre
      todo(() => sb.from("movimientos_stock_vista").select("*").gte("creado_en", d0).order("id")),
      todo(() => sb.from("pagos_vista").select("*").gte("fecha", d0).lte("fecha", d1).order("fecha")),
      todo(() => sb.from("trabajos_suelo_vista").select("*").gte("fecha", desde).lte("fecha", hasta).order("fecha")),
      materiales.list(),
      cuentas.list(),
    ]);
    return { remitos, movimientos, pagos, suelos, materiales: mats, cuentas: cuentasCli };
  },
};
