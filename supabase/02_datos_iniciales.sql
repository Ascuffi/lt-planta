-- =====================================================================
-- LT Hormigones · 02_datos_iniciales.sql
-- Pegar en Supabase > SQL Editor > Run, DESPUÉS de 01_esquema.sql.
-- Carga silos, acopios, fórmulas y flota. Revisá los valores marcados ⚠.
-- =====================================================================

insert into public.configuracion (clave, valor) values
  ('empresa_nombre',        'LOGÍSTICA TRANSPORTADORA S.A.'),
  ('empresa_linea2',        'LT Hormigones'),
  ('empresa_cuit',          ''),
  ('empresa_direccion',     ''),
  ('empresa_telefono',      ''),
  ('remito_punto_venta',    '0001'),
  ('remito_numero_inicial', '1');

-- Capacidades tomadas del sistema anterior. Áridos: capacidad de referencia
-- para el dibujo del acopio (se cambia en Stock > Configurar).
insert into public.materiales (id, nombre, tipo, unidad, capacidad, minimo, orden) values
  ('silo1',     'Silo de cemento 1', 'cemento', 'kg',  45000,  8000, 1),
  ('silo2',     'Silo de cemento 2', 'cemento', 'kg',  75000,  8000, 2),
  ('silo3',     'Silo de cemento 3', 'cemento', 'kg',  75000,  8000, 3),
  ('arena',     'Arena',             'arido',   'kg', 300000, 30000, 4),
  ('piedra620', 'Piedra 6/20',       'arido',   'kg', 300000, 30000, 5),
  ('piedra06',  'Piedra 0/6',        'arido',   'kg', 300000, 30000, 6),
  ('agua',      'Tanque de agua',    'agua',    'L',   10000,  2000, 7);

-- Dosificación por m³ (planilla de fórmulas). Precio en 0: cargarlo en Fórmulas.
insert into public.formulas (nombre, cemento_kg, piedra620_kg, piedra06_kg, arena_kg, agua_l, orden) values
  ('H4',      120, 1050,  600, 340, 160,  1),
  ('H8',      140,  950,  600, 340, 160,  2),
  ('H13',     210,  900,  500, 440, 175,  4),   -- ⚠ piedra 6/20 sobreescrita en la planilla (900)
  ('H15',     230,  820,  350, 600, 170,  5),
  ('H17',     250,  820,  350, 600, 175,  6),
  ('H21',     290,  850,  400, 700, 170,  7),   -- ⚠ arena 700 (¿o 490?)
  ('H25',     360,  880,  400, 490, 150,  8),
  ('H30',     370,  873,  300, 700, 154,  9),
  ('H35',     395,  873,  429, 424, 178, 10),
  ('Mortero', 300,    0, 1300, 500, 190, 11);
-- H10 estaba vacío en la planilla: se agrega desde la pantalla Fórmulas.

insert into public.vehiculos (grupo, tipo, denominacion, marca, modelo, anio, dominio, capacidad_m3, capacidad, nota, orden) values
  ('hormigon','mixer','Camión mixer','Volvo','VM 270 8X4 R',2018,'AC571CR',10,'10 m³',null,1),
  ('hormigon','mixer','Camión mixer','Volvo','VM 270 6X4 R',2017,'AC263GU',8,'8 m³',null,2),
  ('hormigon','mixer','Semitrompo hormigonero','DC-Indumix','03-MTIS',2017,'AB212FY',10,'10 m³',null,3),
  ('hormigon','mixer','Camión mixer','Volvo','723-VM 270 8X4 R',2021,'AF000IQ',10,'10 m³',null,4),
  ('hormigon','tolva','Tolva carga cemento a granel','Randon','164-SR-SL-02+01',2016,'AA731BS',null,'30 t',null,5),
  ('hormigon','bomba','Bomba hormigonera de arrastre','Putzmeister','TK40',2017,null,null,null,'Sin dominio',6),
  ('hormigon','bomba','Bomba hormigonera pluma',null,null,2015,null,null,null,'Completar marca, modelo y dominio',7),
  ('suelos','equipo','Retroexcavadora sobre oruga','Link Belt','210 X2',2015,'CXD46',null,null,null,10),
  ('suelos','equipo','Motoniveladora','Caterpillar','140H',1997,null,null,null,'Sin dominio',11),
  ('suelos','equipo','Pala cargadora frontal','SDLG','LG946L',2022,'FCE85',null,null,null,12),
  ('suelos','equipo','Pala cargadora frontal','SDLG','L936H',2022,'ESN88',null,null,null,13),
  ('suelos','equipo','Compactador de suelo','SDLG','RS7120',2018,null,null,null,'Sin dominio',14),
  ('suelos','camion','Camión regador','Ford','F-7000',1977,'VSS839',null,null,null,15),
  ('suelos','equipo','Cargadora retroexcavadora','SDLG','B876F',2020,'EDT11',null,null,null,16),
  ('suelos','equipo','Pala cargadora frontal','SDLG','L936',2021,'EDT87',null,null,null,17),
  ('aridos','tractor','Tractor con cabina dormitorio','Volvo','FH 420 6X2 T',2021,'AF000IZ',null,null,null,20),
  ('aridos','semirremolque','Batea semirremolque','Randon','25 SR BA 03',2023,'AF693MK',null,null,null,21),
  ('aridos','tractor','Tractor con cabina dormitorio','Volkswagen','Meteor 28.460',2025,'AH513QO',null,null,null,22),
  ('aridos','semirremolque','Batea semirremolque','Randon','12-SR.BA.02+01',2019,'AE039AC',null,null,null,23),
  ('aridos','semirremolque','Carretón semirremolque importado','Randon','SR.CT.03',2013,'NBE174',null,null,'Chasis 9ADCSRA3CEM370995',24),
  ('aridos','camion','Camión balancín volcador','Volvo','VM 330 6X4 R',2018,'AD465XN',null,null,null,25),
  ('aridos','camion','Camión balancín volcador','Volvo','FMX 460 8X4R',2026,'AI057RC',null,null,null,26),
  ('aridos','semirremolque','Carretón semirremolque importado','Patronelli','ACCG3E',2020,'AC004KK',null,null,null,27);
