// src/utils/itemTheme.ts

/**
 * Acepta tanto un string directo ("arma") como el objeto item completo ({ categoria: "arma", ... })
 */
export const getItemTypeClass = (itemOrType?: any): string => {
  if (!itemOrType) return 'item-misc';

  // Si pasaron el objeto completo, busca las propiedades habituales; si no, asume que es el string
  const raw = typeof itemOrType === 'string' 
    ? itemOrType 
    : (itemOrType.categoria || itemOrType.tipo || itemOrType.category || itemOrType.tipo_item || '');

  const t = String(raw).toLowerCase().trim();

  // Armas
  if (t.includes('arma') || t.includes('weapon') || t.includes('espada') || t.includes('arco')) {
    return 'item-weapon';
  }

  // Armaduras y Escudos
  if (t.includes('armadura') || t.includes('armor') || t.includes('escudo') || t.includes('shield')) {
    return 'item-armor';
  }

  // Pociones y Alquimia
  if (t.includes('pocion') || t.includes('poción') || t.includes('potion') || t.includes('veneno')) {
    return 'item-potion';
  }

  // Pergaminos y Libros
  if (t.includes('pergamino') || t.includes('scroll') || t.includes('libro') || t.includes('tomo')) {
    return 'item-scroll';
  }

  // Joyería y Anillos
  if (t.includes('anillo') || t.includes('ring') || t.includes('joya') || t.includes('amuleto')) {
    return 'item-ring';
  }

  // Varitas y Objetos mágicos
  if (t.includes('varita') || t.includes('wand') || t.includes('bastón') || t.includes('staff') || t.includes('magico') || t.includes('mágico') || t.includes('wondrous')) {
    return 'item-wondrous';
  }

  return 'item-misc';
};