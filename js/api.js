// Elige el origen de datos: Supabase (real) o demostración.
const cfg = window.LT_CONFIG || {};
const forzarDemo = new URLSearchParams(location.search).has("demo");
export const MODO_DEMO = forzarDemo || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY;

const api = MODO_DEMO ? await import("./api-demo.js") : await import("./api-supabase.js");
export default api;
