-- =====================================================================
-- LT Hormigones · Sistema de planta
-- 01_esquema.sql  →  Pegar completo en Supabase > SQL Editor > Run
-- Crea tablas, permisos y funciones. Se puede correr una sola vez
-- sobre un proyecto nuevo.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- USUARIOS (perfil de cada cuenta de acceso)
-- ---------------------------------------------------------------------
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  usuario    text not null unique,
  nombre     text not null,
  rol        text not null default 'operador' check (rol in ('admin','operador')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- Al crear una cuenta se crea su perfil.
-- La PRIMERA cuenta es administrador y queda habilitada.
-- Cualquier otra cuenta creada por fuera de la app queda DESHABILITADA
-- hasta que un administrador la habilite (seguridad).
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_hay_admin boolean := exists (select 1 from public.perfiles where rol = 'admin');
begin
  insert into public.perfiles (id, usuario, nombre, rol, activo)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    case when v_hay_admin then 'operador' else 'admin' end,
    not v_hay_admin
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

create or replace function public.es_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo);
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'admin');
$$;

-- Verifica la contraseña de quien está usando el sistema (firma de responsable)
create or replace function public.verificar_mi_password(p_password text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  if v_hash is null or p_password is null or p_password = '' then return false; end if;
  return v_hash = extensions.crypt(p_password, v_hash);
end $$;

-- ---------------------------------------------------------------------
-- STOCK: silos de cemento, acopios de áridos y tanque de agua
-- ---------------------------------------------------------------------
create table public.materiales (
  id         text primary key,                 -- silo1, silo2, silo3, arena, piedra620, piedra06, agua
  nombre     text not null,
  tipo       text not null check (tipo in ('cemento','arido','agua')),
  unidad     text not null check (unidad in ('kg','L')),
  capacidad  numeric not null default 0 check (capacidad >= 0),
  stock      numeric not null default 0,
  minimo     numeric not null default 0 check (minimo >= 0),
  orden      int not null default 0
);

create table public.movimientos_stock (
  id           bigserial primary key,
  material_id  text not null references public.materiales(id),
  cantidad     numeric not null,               -- + entra, - sale
  tipo         text not null check (tipo in ('ingreso','consumo','ajuste','anulacion')),
  remito_id    bigint,
  nota         text,
  usuario_id   uuid default auth.uid() references public.perfiles(id),
  creado_en    timestamptz not null default now()
);
create index on public.movimientos_stock (material_id, creado_en desc);

create or replace function public.aplicar_movimiento_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.materiales set stock = stock + new.cantidad where id = new.material_id;
  return new;
end $$;

create trigger al_insertar_movimiento
  after insert on public.movimientos_stock
  for each row execute function public.aplicar_movimiento_stock();

-- ---------------------------------------------------------------------
-- FÓRMULAS (dosificación por m³)
-- ---------------------------------------------------------------------
create table public.formulas (
  id            serial primary key,
  nombre        text not null unique,         -- H4, H8, ... Mortero
  cemento_kg    numeric not null default 0 check (cemento_kg   >= 0),
  piedra620_kg  numeric not null default 0 check (piedra620_kg >= 0),
  piedra06_kg   numeric not null default 0 check (piedra06_kg  >= 0),
  arena_kg      numeric not null default 0 check (arena_kg     >= 0),
  agua_l        numeric not null default 0 check (agua_l       >= 0),
  precio_m3     numeric not null default 0 check (precio_m3    >= 0),
  activa        boolean not null default true,
  orden         int not null default 0
);

-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
create table public.clientes (
  id         bigserial primary key,
  nombre     text not null,
  cuit       text,
  telefono   text,
  direccion  text,
  nota       text,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PERSONAL (choferes y operadores) y FLOTA
-- ---------------------------------------------------------------------
create table public.personal (
  id              bigserial primary key,
  nombre          text not null,
  funcion         text not null default 'chofer' check (funcion in ('chofer','operador','chofer y operador')),
  telefono        text,
  dni             text,
  venc_licencia   date,
  nota            text,
  activo          boolean not null default true
);

create table public.vehiculos (
  id            bigserial primary key,
  grupo         text not null check (grupo in ('hormigon','suelos','aridos')),
  tipo          text not null default 'otro'
                check (tipo in ('mixer','bomba','tolva','equipo','camion','tractor','semirremolque','otro')),
  denominacion  text not null,
  marca         text,
  modelo        text,
  anio          int,
  dominio       text,
  capacidad_m3  numeric,                       -- solo mixers
  capacidad     text,                          -- texto libre (30 t, etc.)
  estado        text not null default 'disponible'
                check (estado in ('disponible','en_viaje','trabajando','taller')),
  personal_id   bigint references public.personal(id),   -- chofer/operador asignado
  venc_revision date,
  nota          text,
  activo        boolean not null default true,
  orden         int not null default 0
);

-- ---------------------------------------------------------------------
-- PEDIDOS (lo que pidió el cliente; se entrega en uno o varios remitos)
-- ---------------------------------------------------------------------
create table public.pedidos (
  id              bigserial primary key,
  cliente_id      bigint not null references public.clientes(id),
  obra_direccion  text,
  formula_id      int not null references public.formulas(id),
  m3              numeric not null check (m3 > 0),
  fecha_entrega   date not null default current_date,
  hora            text,
  requiere_bomba  boolean not null default false,
  estado          text not null default 'pendiente' check (estado in ('pendiente','completo','cancelado')),
  nota            text,
  creado_por      uuid default auth.uid() references public.perfiles(id),
  creado_en       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- REMITOS (cada venta de hormigón) y PAGOS
-- ---------------------------------------------------------------------
create table public.remitos (
  id               bigserial primary key,
  numero           int not null unique,
  fecha            timestamptz not null default now(),
  cliente_id       bigint not null references public.clientes(id),
  obra_direccion   text,
  pedido_id        bigint references public.pedidos(id),
  formula_id       int not null references public.formulas(id),
  formula_nombre   text not null,
  m3               numeric not null check (m3 > 0),
  precio_m3        numeric not null default 0 check (precio_m3 >= 0),
  total            numeric not null default 0,
  silo_id          text not null references public.materiales(id),
  vehiculo_id      bigint references public.vehiculos(id),
  chofer_id        bigint references public.personal(id),
  bomba_id         bigint references public.vehiculos(id),
  consumo          jsonb not null default '{}'::jsonb,
  nota             text,
  estado           text not null default 'emitido' check (estado in ('emitido','anulado')),
  creado_por       uuid references public.perfiles(id),
  anulado_por      uuid references public.perfiles(id),
  anulado_en       timestamptz,
  motivo_anulacion text
);
create index on public.remitos (fecha desc);
create index on public.remitos (cliente_id);

alter table public.movimientos_stock
  add constraint movimientos_stock_remito_fk foreign key (remito_id) references public.remitos(id);

create table public.pagos (
  id               bigserial primary key,
  cliente_id       bigint not null references public.clientes(id),
  remito_id        bigint references public.remitos(id),
  monto            numeric not null check (monto > 0),
  medio            text not null check (medio in ('contado','transferencia','deposito')),
  referencia       text,
  fecha            timestamptz not null default now(),
  confirmado_por   uuid not null references public.perfiles(id),
  anulado          boolean not null default false,
  anulado_por      uuid references public.perfiles(id),
  anulado_en       timestamptz,
  motivo_anulacion text
);
create index on public.pagos (cliente_id);
create index on public.pagos (remito_id);

-- ---------------------------------------------------------------------
-- MOVIMIENTO DE SUELOS (parte diario de equipos)
-- ---------------------------------------------------------------------
create table public.trabajos_suelo (
  id           bigserial primary key,
  fecha        date not null default current_date,
  vehiculo_id  bigint not null references public.vehiculos(id),
  personal_id  bigint references public.personal(id),
  cliente_id   bigint references public.clientes(id),
  obra         text,
  tarea        text,
  horas        numeric check (horas >= 0),
  viajes       int check (viajes >= 0),
  nota         text,
  creado_por   uuid default auth.uid() references public.perfiles(id),
  creado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONFIGURACIÓN (número del próximo remito, datos de la empresa)
-- ---------------------------------------------------------------------
create table public.configuracion (
  clave  text primary key,
  valor  text
);

-- =====================================================================
-- VISTAS
-- =====================================================================
create view public.remitos_vista with (security_invoker = true) as
select r.*,
       c.nombre   as cliente_nombre,
       c.cuit     as cliente_cuit,
       c.telefono as cliente_telefono,
       v.dominio  as vehiculo_dominio,
       v.denominacion as vehiculo_nombre,
       ch.nombre  as chofer_nombre,
       b.denominacion as bomba_nombre,
       pc.nombre  as creado_por_nombre,
       coalesce(pg.pagado, 0) as pagado,
       pg.medios  as medios_pago,
       case when r.estado = 'anulado' then 'anulado'
            when coalesce(pg.pagado, 0) >= r.total and r.total > 0 then 'pagado'
            when r.total = 0 then 'sin precio'
            when coalesce(pg.pagado, 0) > 0 then 'parcial'
            else 'pendiente' end as pago_estado
from public.remitos r
join public.clientes c on c.id = r.cliente_id
left join public.vehiculos v on v.id = r.vehiculo_id
left join public.personal ch on ch.id = r.chofer_id
left join public.vehiculos b on b.id = r.bomba_id
left join public.perfiles pc on pc.id = r.creado_por
left join lateral (
  select sum(p.monto) as pagado,
         string_agg(distinct p.medio, ', ') as medios
  from public.pagos p where p.remito_id = r.id and not p.anulado
) pg on true;

create view public.pagos_vista with (security_invoker = true) as
select p.*, c.nombre as cliente_nombre, r.numero as remito_numero,
       pf.nombre as confirmado_por_nombre, pa.nombre as anulado_por_nombre
from public.pagos p
join public.clientes c on c.id = p.cliente_id
left join public.remitos r on r.id = p.remito_id
join public.perfiles pf on pf.id = p.confirmado_por
left join public.perfiles pa on pa.id = p.anulado_por;

create view public.cuentas_clientes with (security_invoker = true) as
select c.id, c.nombre, c.cuit, c.telefono, c.direccion, c.activo,
       coalesce(rm.total, 0)  as total_remitos,
       coalesce(pg.total, 0)  as total_pagos,
       coalesce(rm.total, 0) - coalesce(pg.total, 0) as saldo,
       rm.ultimo as ultimo_remito
from public.clientes c
left join (select cliente_id, sum(total) total, max(fecha) ultimo
           from public.remitos where estado = 'emitido' group by cliente_id) rm on rm.cliente_id = c.id
left join (select cliente_id, sum(monto) total
           from public.pagos where not anulado group by cliente_id) pg on pg.cliente_id = c.id;

create view public.pedidos_vista with (security_invoker = true) as
select p.*, c.nombre as cliente_nombre, f.nombre as formula_nombre, f.precio_m3 as formula_precio,
       coalesce(e.m3, 0) as m3_entregados,
       greatest(p.m3 - coalesce(e.m3, 0), 0) as m3_pendientes
from public.pedidos p
join public.clientes c on c.id = p.cliente_id
join public.formulas f on f.id = p.formula_id
left join (select pedido_id, sum(m3) m3 from public.remitos
           where estado = 'emitido' and pedido_id is not null group by pedido_id) e on e.pedido_id = p.id;

create view public.movimientos_stock_vista with (security_invoker = true) as
select m.*, mt.nombre as material_nombre, mt.unidad, pf.nombre as usuario_nombre, r.numero as remito_numero
from public.movimientos_stock m
join public.materiales mt on mt.id = m.material_id
left join public.perfiles pf on pf.id = m.usuario_id
left join public.remitos r on r.id = m.remito_id;

create view public.trabajos_suelo_vista with (security_invoker = true) as
select t.*, v.denominacion as vehiculo_nombre, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo,
       v.dominio as vehiculo_dominio, p.nombre as personal_nombre, c.nombre as cliente_nombre
from public.trabajos_suelo t
join public.vehiculos v on v.id = t.vehiculo_id
left join public.personal p on p.id = t.personal_id
left join public.clientes c on c.id = t.cliente_id;

-- =====================================================================
-- FUNCIONES DE OPERACIÓN (la app las llama; hacen todo en un solo paso)
-- =====================================================================

-- Pago interno (ya verificada la contraseña)
create or replace function public._insertar_pago(
  p_cliente_id bigint, p_remito_id bigint, p_monto numeric, p_medio text, p_referencia text
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_medio not in ('contado','transferencia','deposito') then
    raise exception 'Elegí cómo pagó: contado, transferencia o depósito.';
  end if;
  insert into public.pagos (cliente_id, remito_id, monto, medio, referencia, confirmado_por)
  values (p_cliente_id, p_remito_id, round(p_monto, 2), p_medio, nullif(trim(p_referencia), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public._insertar_pago(bigint, bigint, numeric, text, text) from public, anon, authenticated;

-- EMITIR REMITO: crea el remito, descuenta stock, mueve el mixer y
-- (opcional) registra el pago con contraseña de quien cobra.
create or replace function public.emitir_remito(p jsonb)
returns public.remitos language plpgsql security definer set search_path = public as $$
declare
  f        public.formulas;
  v_m3     numeric := (p->>'m3')::numeric;
  v_precio numeric;
  v_silo   text := coalesce(p->>'silo_id', 'silo1');
  v_num    int;
  r        public.remitos;
  v_cons   jsonb;
  v_pago   jsonb := p->'pago';
begin
  if not public.es_activo() then raise exception 'Tu usuario no está habilitado.'; end if;
  if v_m3 is null or v_m3 <= 0 then raise exception 'Indicá los m³ a entregar.'; end if;
  if v_m3 > 20 then raise exception 'Revisá los m³: un remito no puede superar 20 m³.'; end if;
  if (p->>'cliente_id') is null then raise exception 'Elegí el cliente.'; end if;

  select * into f from public.formulas where id = (p->>'formula_id')::int and activa;
  if not found then raise exception 'Elegí un tipo de hormigón válido.'; end if;
  if not exists (select 1 from public.materiales where id = v_silo and tipo = 'cemento') then
    raise exception 'Elegí de qué silo sale el cemento.';
  end if;

  -- solo el administrador puede cambiar el precio en el remito; el resto usa el de la fórmula
  v_precio := case when public.es_admin() then coalesce((p->>'precio_m3')::numeric, f.precio_m3, 0) else f.precio_m3 end;
  if v_precio < 0 then raise exception 'El precio no puede ser negativo.'; end if;

  -- número correlativo, sin saltos ni repetidos
  perform pg_advisory_xact_lock(424242);
  select greatest(coalesce(max(numero), 0) + 1,
                  coalesce((select valor::int from public.configuracion where clave = 'remito_numero_inicial'), 1))
    into v_num from public.remitos;

  v_cons := jsonb_build_object(
    v_silo,      round(f.cemento_kg   * v_m3, 1),
    'piedra620', round(f.piedra620_kg * v_m3, 1),
    'piedra06',  round(f.piedra06_kg  * v_m3, 1),
    'arena',     round(f.arena_kg     * v_m3, 1),
    'agua',      round(f.agua_l       * v_m3, 1));

  insert into public.remitos (numero, cliente_id, obra_direccion, pedido_id, formula_id, formula_nombre,
                              m3, precio_m3, total, silo_id, vehiculo_id, chofer_id, bomba_id, consumo, nota, creado_por)
  values (v_num, (p->>'cliente_id')::bigint, nullif(trim(p->>'obra_direccion'), ''), (p->>'pedido_id')::bigint,
          f.id, f.nombre, v_m3, v_precio, round(v_m3 * v_precio, 2), v_silo,
          (p->>'vehiculo_id')::bigint, (p->>'chofer_id')::bigint, (p->>'bomba_id')::bigint,
          v_cons, nullif(trim(p->>'nota'), ''), auth.uid())
  returning * into r;

  insert into public.movimientos_stock (material_id, cantidad, tipo, remito_id, nota)
  select key, -(value::text::numeric), 'consumo', r.id, 'Remito N° ' || r.numero
  from jsonb_each(v_cons) where value::text::numeric > 0;

  if r.vehiculo_id is not null then
    update public.vehiculos set estado = 'en_viaje',
           personal_id = coalesce(r.chofer_id, personal_id) where id = r.vehiculo_id;
  end if;
  if r.bomba_id is not null then
    update public.vehiculos set estado = 'trabajando' where id = r.bomba_id;
  end if;

  if r.pedido_id is not null then
    update public.pedidos pe set estado = 'completo'
    where pe.id = r.pedido_id and pe.estado = 'pendiente'
      and (select coalesce(sum(m3), 0) from public.remitos where pedido_id = pe.id and estado = 'emitido') >= pe.m3;
  end if;

  if v_pago is not null and coalesce(v_pago->>'medio', '') <> '' then
    if r.total <= 0 then raise exception 'El remito no tiene precio: no se puede registrar el pago.'; end if;
    if not public.verificar_mi_password(v_pago->>'password') then
      raise exception 'Contraseña incorrecta. El remito NO se emitió.';
    end if;
    perform public._insertar_pago(r.cliente_id, r.id, r.total, v_pago->>'medio', v_pago->>'referencia');
  end if;

  return r;
end $$;

-- CONFIRMAR PAGO (pide la contraseña de quien lo carga)
create or replace function public.confirmar_pago(
  p_cliente_id bigint, p_remito_id bigint, p_monto numeric, p_medio text, p_referencia text, p_password text
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_rem public.remitos;
begin
  if not public.es_activo() then raise exception 'Tu usuario no está habilitado.'; end if;
  if not public.verificar_mi_password(p_password) then raise exception 'Contraseña incorrecta. El pago NO se registró.'; end if;
  if p_remito_id is not null then
    select * into v_rem from public.remitos where id = p_remito_id;
    if not found or v_rem.cliente_id <> p_cliente_id then raise exception 'El remito no corresponde a ese cliente.'; end if;
    if v_rem.estado = 'anulado' then raise exception 'Ese remito está anulado.'; end if;
  end if;
  return public._insertar_pago(p_cliente_id, p_remito_id, p_monto, p_medio, p_referencia);
end $$;

-- ANULAR PAGO (solo administrador, con contraseña)
create or replace function public.anular_pago(p_pago_id bigint, p_motivo text, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede anular pagos.'; end if;
  if not public.verificar_mi_password(p_password) then raise exception 'Contraseña incorrecta.'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Escribí el motivo de la anulación.'; end if;
  update public.pagos set anulado = true, anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = p_motivo
  where id = p_pago_id and not anulado;
  if not found then raise exception 'El pago no existe o ya estaba anulado.'; end if;
end $$;

-- ANULAR REMITO (solo administrador): devuelve el stock
create or replace function public.anular_remito(p_remito_id bigint, p_motivo text, p_password text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.remitos;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede anular remitos.'; end if;
  if not public.verificar_mi_password(p_password) then raise exception 'Contraseña incorrecta.'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Escribí el motivo de la anulación.'; end if;
  select * into r from public.remitos where id = p_remito_id for update;
  if not found or r.estado = 'anulado' then raise exception 'El remito no existe o ya estaba anulado.'; end if;
  if exists (select 1 from public.pagos where remito_id = r.id and not anulado) then
    raise exception 'Ese remito tiene pagos registrados. Anulá primero el pago.';
  end if;
  update public.remitos set estado = 'anulado', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = p_motivo
  where id = r.id;
  insert into public.movimientos_stock (material_id, cantidad, tipo, remito_id, nota)
  select key, value::text::numeric, 'anulacion', r.id, 'Anulación remito N° ' || r.numero
  from jsonb_each(r.consumo) where value::text::numeric > 0;
  if r.pedido_id is not null then
    update public.pedidos set estado = 'pendiente' where id = r.pedido_id and estado = 'completo';
  end if;
end $$;

-- INGRESO de material (camión de cemento, arena, piedra; carga de agua)
create or replace function public.registrar_ingreso(p_material_id text, p_cantidad numeric, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_activo() then raise exception 'Tu usuario no está habilitado.'; end if;
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad debe ser mayor a cero.'; end if;
  if not exists (select 1 from public.materiales where id = p_material_id) then raise exception 'Material inválido.'; end if;
  insert into public.movimientos_stock (material_id, cantidad, tipo, nota)
  values (p_material_id, p_cantidad, 'ingreso', nullif(trim(p_nota), ''));
end $$;

-- AJUSTE: se mide el nivel real y se corrige el sistema
create or replace function public.ajustar_stock(p_material_id text, p_stock_real numeric, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actual numeric;
begin
  if not public.es_activo() then raise exception 'Tu usuario no está habilitado.'; end if;
  if p_stock_real is null or p_stock_real < 0 then raise exception 'Indicá la cantidad real medida.'; end if;
  select stock into v_actual from public.materiales where id = p_material_id for update;
  if not found then raise exception 'Material inválido.'; end if;
  if p_stock_real = v_actual then return; end if;
  insert into public.movimientos_stock (material_id, cantidad, tipo, nota)
  values (p_material_id, p_stock_real - v_actual, 'ajuste', coalesce(nullif(trim(p_nota), ''), 'Medición en planta'));
end $$;

-- USUARIOS: el administrador crea cuentas y cambia contraseñas desde la app
create or replace function public.admin_crear_usuario(p_usuario text, p_nombre text, p_password text, p_rol text, p_dominio text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := gen_random_uuid(); v_email text;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede crear usuarios.'; end if;
  p_usuario := lower(trim(p_usuario));
  if p_usuario !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'El usuario debe tener entre 3 y 30 letras o números, sin espacios ni acentos.';
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres.'; end if;
  if p_rol not in ('admin','operador') then raise exception 'Rol inválido.'; end if;
  v_email := p_usuario || '@' || p_dominio;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Ese usuario ya existe.'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nombre', trim(p_nombre)),
          now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  update public.perfiles set nombre = trim(p_nombre), rol = p_rol, usuario = p_usuario, activo = true where id = v_id;
  return v_id;
end $$;

create or replace function public.admin_cambiar_password(p_usuario_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.es_admin() and p_usuario_id <> auth.uid() then
    raise exception 'Solo un administrador puede cambiar la contraseña de otra persona.';
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_usuario_id;
  if not found then raise exception 'Usuario inexistente.'; end if;
end $$;

-- Evita quedarse sin administradores
create or replace function public.proteger_ultimo_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.rol = 'admin' and old.activo and (new.rol <> 'admin' or not new.activo)
     and not exists (select 1 from public.perfiles where rol = 'admin' and activo and id <> old.id) then
    raise exception 'Tiene que quedar al menos un administrador activo.';
  end if;
  return new;
end $$;
create trigger proteger_admin before update on public.perfiles
  for each row execute function public.proteger_ultimo_admin();

-- =====================================================================
-- PERMISOS (Row Level Security)
--  · Cualquier usuario activo ve todo.
--  · Remitos, pagos y stock SOLO se modifican con las funciones de arriba.
--  · Fórmulas, precios, materiales, usuarios y configuración: solo admin.
-- =====================================================================
alter table public.perfiles          enable row level security;
alter table public.materiales        enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.formulas          enable row level security;
alter table public.clientes          enable row level security;
alter table public.personal          enable row level security;
alter table public.vehiculos         enable row level security;
alter table public.pedidos           enable row level security;
alter table public.remitos           enable row level security;
alter table public.pagos             enable row level security;
alter table public.trabajos_suelo    enable row level security;
alter table public.configuracion     enable row level security;

-- lectura para usuarios activos
create policy leer on public.perfiles          for select to authenticated using (public.es_activo() or id = auth.uid());
create policy leer on public.materiales        for select to authenticated using (public.es_activo());
create policy leer on public.movimientos_stock for select to authenticated using (public.es_activo());
create policy leer on public.formulas          for select to authenticated using (public.es_activo());
create policy leer on public.clientes          for select to authenticated using (public.es_activo());
create policy leer on public.personal          for select to authenticated using (public.es_activo());
create policy leer on public.vehiculos         for select to authenticated using (public.es_activo());
create policy leer on public.pedidos           for select to authenticated using (public.es_activo());
create policy leer on public.remitos           for select to authenticated using (public.es_activo());
create policy leer on public.pagos             for select to authenticated using (public.es_activo());
create policy leer on public.trabajos_suelo    for select to authenticated using (public.es_activo());
create policy leer on public.configuracion     for select to authenticated using (public.es_activo());

-- carga diaria: cualquier usuario activo
create policy crear     on public.clientes       for insert to authenticated with check (public.es_activo());
create policy modificar on public.clientes       for update to authenticated using (public.es_activo()) with check (public.es_activo());
create policy crear     on public.pedidos        for insert to authenticated with check (public.es_activo());
create policy modificar on public.pedidos        for update to authenticated using (public.es_activo()) with check (public.es_activo());
create policy crear     on public.trabajos_suelo for insert to authenticated with check (public.es_activo());
create policy modificar on public.vehiculos      for update to authenticated using (public.es_activo()) with check (public.es_activo());
create policy modificar on public.personal       for update to authenticated using (public.es_activo()) with check (public.es_activo());

-- altas de flota y personal, configuración: administrador
create policy crear     on public.vehiculos      for insert to authenticated with check (public.es_admin());
create policy crear     on public.personal       for insert to authenticated with check (public.es_admin());
create policy crear     on public.formulas       for insert to authenticated with check (public.es_admin());
create policy modificar on public.formulas       for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy modificar on public.materiales     for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy modificar on public.perfiles       for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy borrar    on public.trabajos_suelo for delete to authenticated using (public.es_admin());
create policy crear     on public.configuracion  for insert to authenticated with check (public.es_admin());
create policy modificar on public.configuracion  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- El stock nunca se edita "a mano": solo con ingreso, ajuste o remito (queda registrado quién)
create or replace function public.proteger_stock()
returns trigger language plpgsql as $$
begin
  if new.stock is distinct from old.stock and pg_trigger_depth() < 2 then
    raise exception 'El stock se modifica con Ingreso o Ajuste, no editándolo directamente.';
  end if;
  return new;
end $$;
create trigger proteger_stock before update on public.materiales
  for each row execute function public.proteger_stock();

-- Nadie entra sin iniciar sesión
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
grant execute on function public.emitir_remito(jsonb), public.confirmar_pago(bigint,bigint,numeric,text,text,text),
  public.anular_pago(bigint,text,text), public.anular_remito(bigint,text,text),
  public.registrar_ingreso(text,numeric,text), public.ajustar_stock(text,numeric,text),
  public.admin_crear_usuario(text,text,text,text,text), public.admin_cambiar_password(uuid,text),
  public.es_activo(), public.es_admin() to authenticated;
revoke execute on function public.verificar_mi_password(text) from public, anon;
grant execute on function public.verificar_mi_password(text) to authenticated;
