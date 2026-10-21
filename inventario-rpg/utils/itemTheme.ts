// src/utils/itemTheme.ts

export const getItemTypeClass = (itemOrType?: any): string => {
  if (!itemOrType) return 'item-equipo';

  const raw = typeof itemOrType === 'string'
    ? itemOrType
    : (itemOrType.categoria || itemOrType.tipo || itemOrType.category || '');

  const t = String(raw).toLowerCase().trim();

  // 1. ARMAS
  if (t === 'arma' || t.includes('arma') || t.includes('weapon')) return 'item-weapon';

  // 2. ARMADURAS
  if (t === 'armadura' || t.includes('armor') || t.includes('escudo')) return 'item-armor';

  // 3. MUNICIÓN (Nuevo)
  if (t === 'municion' || t.includes('flecha') || t.includes('virote') || t.includes('bala')) return 'item-ammo';

  // 4. ALIMENTOS Y BEBIDAS (Nuevo)
  if (t === 'alimento' || t.includes('comida') || t.includes('racion') || t.includes('bebida')) return 'item-food';

  // 5. POCIONES Y VENENOS
  if (t === 'pocion' || t.includes('potion') || t.includes('alquimia')) return 'item-potion';

  // 6. MAGIA, PERGAMINOS Y RUNAS
  if (t === 'magia' || t.includes('scroll') || t.includes('libro') || t.includes('hechizo')) return 'item-magic';

  // 7. HERRAMIENTAS E INSTRUMENTOS
  if (t === 'herramienta' || t.includes('tool') || t.includes('instrumento')) return 'item-tool';

  // 8. TESOROS Y JOYAS
  if (t === 'tesoro' || t.includes('gem') || t.includes('oro') || t.includes('joya')) return 'item-treasure';

  // 9. EQUIPO GENERAL / POR DEFECTO
  return 'item-equipo';
};

export const formatearPeso = (libras: number | string): string => {
  const lb = Number(libras) || 0;
  const kg = lb * 0.453592; // Conversión real estándar
  // Si da 0 o es muy chico pero existe, que muestre 0.1 al menos
  return kg > 0 && kg < 0.1 ? '0.1 kg' : `${kg.toFixed(1)} kg`;
};