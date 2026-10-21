import { createClient } from '@supabase/supabase-js';
import type { 
  ItemCatalogo, 
  ItemInventario, 
  Personaje, 
  ItemMesaComun, 
  Tienda, 
  TiendaItem,
  DesgloseMonedas,
  SolicitudTienda
} from '../types';
import { 
  Sword, Shield, FlaskRound, Scroll, Gem, Wrench, Package, 
  Utensils, Coins, HelpCircle, type LucideProps 
} from 'lucide-react';
import React from 'react';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const icons: Record<string, React.FC<LucideProps>> = {
  sword: Sword, shield: Shield, 'flask-round': FlaskRound, scroll: Scroll,
  gem: Gem, wrench: Wrench, package: Package, utensils: Utensils, coins: Coins,
};

export const ItemIcon = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const Component = icons[name] || HelpCircle;
  return React.createElement(Component, { className });
};

export const cobreAMonedas = (cobre = 0): DesgloseMonedas => ({
  oro: Math.floor(cobre / 100),
  plata: Math.floor((cobre % 100) / 10),
  cobre: cobre % 10,
});

export const monedasACobre = (oro = 0, plata = 0, cobre = 0): number => 
  (oro * 100) + (plata * 10) + cobre;

export const formatearPrecio = (cobre = 0): string => {
  if (cobre <= 0) return 'Gratis';
  const { oro, plata, cobre: pc } = cobreAMonedas(cobre);
  const partes: string[] = [];
  if (oro > 0) partes.push(`${oro} PO`);
  if (plata > 0) partes.push(`${plata} PP`);
  if (pc > 0) partes.push(`${pc} PC`);
  return partes.join(' ') || '0 PC';
};

export const inventoryApi = {
  cargarDatosIniciales: async () => {
    const [catRes, persRes, tiendasRes, tiendaItemsRes, mesaRes] = await Promise.all([
      supabase.from('catalogo_items').select('*').order('nombre'),
      supabase.from('personajes').select('*').order('nombre'),
      supabase.from('tiendas').select('*').order('nombre'),
      supabase.from('tienda_items').select('*, item:catalogo_items(*)'),
      supabase.from('mesa_comun').select('*, item:catalogo_items(*)'),
    ]);

    const tiendasFormateadas: Tienda[] = (tiendasRes.data || []).map(t => ({
      ...t,
      items: (tiendaItemsRes.data || [])
        .filter(ti => ti.tienda_id === t.id)
        .map((ti: any) => ({ ...ti, item: Array.isArray(ti.item) ? ti.item[0] : ti.item })),
    }));

    const mesaFormateada: ItemMesaComun[] = (mesaRes.data || []).map((m: any) => ({
      ...m,
      item: Array.isArray(m.item) ? m.item[0] : m.item,
    }));

    return {
      catalogo: (catRes.data || []) as ItemCatalogo[],
      personajes: (persRes.data || []) as Personaje[],
      tiendas: tiendasFormateadas,
      mesa: mesaFormateada,
    };
  },

  crearItemCatalogo: async (item: Omit<ItemCatalogo, 'id'>) => {
    const { data, error } = await supabase
      .from('catalogo_items')
      .insert([{ ...item }])
      .select()
      .single();
    if (error) throw error;
    return data as ItemCatalogo;
  },

  actualizarItemCatalogo: async (id: string, cambios: Partial<ItemCatalogo>) => {
    const { error } = await supabase
      .from('catalogo_items')
      .update(cambios)
      .eq('id', id);
    if (error) throw error;
  },

  eliminarItemCatalogo: async (id: string) => {
    await supabase.from('mesa_comun').delete().eq('item_id', id);
    await supabase.from('tienda_items').delete().eq('item_id', id);
    const { error } = await supabase.from('catalogo_items').delete().eq('id', id);
    if (error) throw error;
  },

  // Añadir dentro de export const inventoryApi = { ... }

  actualizarTienda: async (tiendaId: string, nombre: string) => {
    const { error } = await supabase
      .from('tiendas')
      .update({ nombre: nombre.trim() })
      .eq('id', tiendaId);
    if (error) throw error;
  },

  eliminarTienda: async (tiendaId: string) => {
    // 1. Limpiar solicitudes pendientes vinculadas a esta tienda
    await supabase.from('solicitudes_tienda').delete().eq('tienda_id', tiendaId);
    // 2. Limpiar inventario de la tienda
    await supabase.from('tienda_items').delete().eq('tienda_id', tiendaId);
    // 3. Eliminar la tienda
    const { error } = await supabase.from('tiendas').delete().eq('id', tiendaId);
    if (error) throw error;
  },

  cargarInventarioPersonaje: async (personajeId: string) => {
    const { data } = await supabase
      .from('inventarios')
      .select('*, item:catalogo_items(*)')
      .eq('personaje_id', personajeId)
      .order('id');

    return (data || []).map((inv: any) => ({
      ...inv,
      item: Array.isArray(inv.item) ? inv.item[0] : inv.item,
    })) as ItemInventario[];
  },

  cargarInventariosGrupo: async () => {
    const { data } = await supabase
      .from('inventarios')
      .select('*, item:catalogo_items(*)')
      .order('id');

    return (data || []).map((inv: any) => ({
      ...inv,
      item: Array.isArray(inv.item) ? inv.item[0] : inv.item,
    })) as ItemInventario[];
  },

  modificarMonedasPersonaje: async (personajeId: string, nuevoCobre: number) => {
    await supabase.from('personajes').update({ monedas_cobre: Math.max(0, nuevoCobre) }).eq('id', personajeId);
  },

  agregarAInventario: async (personajeId: string, itemId: string, cantidad = 1) => {
    const { data: existente } = await supabase
      .from('inventarios')
      .select('id, cantidad')
      .eq('personaje_id', personajeId)
      .eq('item_id', itemId)
      .eq('equipado', false)
      .eq('es_secreto', false)
      .maybeSingle();

    if (existente) {
      await supabase.from('inventarios').update({ cantidad: existente.cantidad + cantidad }).eq('id', existente.id);
    } else {
      await supabase.from('inventarios').insert([{
        personaje_id: personajeId,
        item_id: itemId,
        cantidad,
        equipado: false,
        es_secreto: false,
      }]);
    }
  },

  eliminarDeInventario: async (invId: string) => {
    await supabase.from('inventarios').delete().eq('id', invId);
  },

  actualizarCantidadInventario: async (invId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      await supabase.from('inventarios').delete().eq('id', invId);
    } else {
      await supabase.from('inventarios').update({ cantidad: nuevaCantidad }).eq('id', invId);
    }
  },

  toggleEquipar: async (invId: string, actual: boolean) => {
    await supabase.from('inventarios').update({ equipado: !actual }).eq('id', invId);
  },

  toggleSecreto: async (invId: string, actual: boolean) => {
    await supabase.from('inventarios').update({ es_secreto: !actual }).eq('id', invId);
  },

  toggleBaulPersonaje: async (personajeId: string, actual: boolean) => {
    await supabase.from('personajes').update({ baul_habilitado: !actual }).eq('id', personajeId);
  },

  moverABaul: async (invId: string, actualEnBaul: boolean) => {
    await supabase.from('inventarios').update({ en_baul: !actualEnBaul }).eq('id', invId);
  },

  entregarItemAJugador: async (personajeId: string, itemId: string, cantidad = 1) => {
    await inventoryApi.agregarAInventario(personajeId, itemId, cantidad);
  },

  soltarEnMesa: async (
    personajeNombre: string, 
    inv: ItemInventario, 
    cantidadASoltar = 1, 
    campanaId = '01'
  ) => {
    // 1. Buscar si ya existe el ítem PERO en ESTA misma campaña
    const { data: itemExistente } = await supabase
      .from('mesa_comun')
      .select('id, cantidad')
      .eq('item_id', inv.item.id)
      .eq('campana_id', campanaId)
      .eq('es_bolsa_monedas', false)
      .maybeSingle();

    const promesas: any[] = [];

    if (itemExistente) {
      promesas.push(
        supabase
          .from('mesa_comun')
          .update({ cantidad: itemExistente.cantidad + cantidadASoltar })
          .eq('id', itemExistente.id)
      );
    } else {
      promesas.push(
        supabase.from('mesa_comun').insert([{
          item_id: inv.item.id,
          cantidad: cantidadASoltar,
          creado_por: personajeNombre,
          es_bolsa_monedas: false,
          campana_id: campanaId, // 👈 Se guarda en la campaña correcta
        }])
      );
    }

    if (inv.id) {
      if (inv.cantidad > cantidadASoltar) {
        promesas.push(
          supabase.from('inventarios').update({ cantidad: inv.cantidad - cantidadASoltar }).eq('id', inv.id)
        );
      } else {
        promesas.push(
          supabase.from('inventarios').delete().eq('id', inv.id)
        );
      }
    }

    await Promise.all(promesas);
  },


  tomarDeMesa: async (personajeId: string, mesaItem: ItemMesaComun) => {
    if (!mesaItem.item_id) return;

    const { data: existente } = await supabase
      .from('inventarios')
      .select('id, cantidad')
      .eq('personaje_id', personajeId)
      .eq('item_id', mesaItem.item_id)
      .eq('equipado', false)
      .eq('es_secreto', false)
      .maybeSingle();

    const promesas: any[] = [];

    if (existente) {
      promesas.push(
        supabase.from('inventarios').update({ cantidad: existente.cantidad + 1 }).eq('id', existente.id)
      );
    } else {
      promesas.push(
        supabase.from('inventarios').insert([{
          personaje_id: personajeId,
          item_id: mesaItem.item_id,
          cantidad: 1,
          equipado: false,
          es_secreto: false,
        }])
      );
    }

    if (mesaItem.cantidad > 1) {
      promesas.push(
        supabase.from('mesa_comun').update({ cantidad: mesaItem.cantidad - 1 }).eq('id', mesaItem.id)
      );
    } else {
      promesas.push(
        supabase.from('mesa_comun').delete().eq('id', mesaItem.id)
      );
    }

    await Promise.all(promesas);
  },

  soltarBolsaMonedas: async (cobreTotal: number, campanaId = '01') => {
    if (cobreTotal <= 0) return;
    await supabase.from('mesa_comun').insert([{
      item_id: null,
      cantidad: 1,
      creado_por: 'DM',
      es_bolsa_monedas: true,
      monedas_cobre_contenido: cobreTotal,
      campana_id: campanaId, // 👈 Se guarda en la campaña correcta
    }]);
  },


  tomarBolsaMonedas: async (personaje: Personaje, bolsa: ItemMesaComun, cantidadCobre?: number) => {
    const disponible = bolsa.monedas_cobre_contenido || 0;
    const aRetirar = cantidadCobre && cantidadCobre <= disponible ? cantidadCobre : disponible;
    if (aRetirar <= 0) return;

    const restante = disponible - aRetirar;
    const promesas: any[] = [
      supabase.from('personajes').update({ monedas_cobre: personaje.monedas_cobre + aRetirar }).eq('id', personaje.id)
    ];

    if (restante > 0) {
      promesas.push(supabase.from('mesa_comun').update({ monedas_cobre_contenido: restante }).eq('id', bolsa.id));
    } else {
      promesas.push(supabase.from('mesa_comun').delete().eq('id', bolsa.id));
    }

    await Promise.all(promesas);
  },

  repartirBolsaMonedas: async (bolsa: ItemMesaComun, personajes: Personaje[]) => {
    const total = bolsa.monedas_cobre_contenido || 0;
    if (total <= 0 || personajes.length === 0) return;

    const parte = Math.floor(total / personajes.length);
    const sobrante = total % personajes.length;

    const promesas: any[] = personajes.map(p =>
      supabase.from('personajes').update({ monedas_cobre: p.monedas_cobre + parte }).eq('id', p.id)
    );

    if (sobrante > 0) {
      promesas.push(supabase.from('mesa_comun').update({ monedas_cobre_contenido: sobrante }).eq('id', bolsa.id));
    } else {
      promesas.push(supabase.from('mesa_comun').delete().eq('id', bolsa.id));
    }

    await Promise.all(promesas);
  },

  venderATienda: async (personaje: Personaje, inv: ItemInventario) => {
    const valorVenta = Math.round(inv.item.precio_cobre * 0.5);
    const promesas: any[] = [
      supabase.from('personajes').update({ monedas_cobre: personaje.monedas_cobre + valorVenta }).eq('id', personaje.id)
    ];

    if (inv.cantidad > 1) {
      promesas.push(supabase.from('inventarios').update({ cantidad: inv.cantidad - 1 }).eq('id', inv.id));
    } else {
      promesas.push(supabase.from('inventarios').delete().eq('id', inv.id));
    }

    await Promise.all(promesas);
  },

  comprarDeTienda: async (personaje: Personaje, tItem: TiendaItem, precioCobre: number) => {
    if (personaje.monedas_cobre < precioCobre) return false;
    const nuevoSaldo = personaje.monedas_cobre - precioCobre;

    const promesas: any[] = [
      supabase.from('personajes').update({ monedas_cobre: nuevoSaldo }).eq('id', personaje.id)
    ];

    if (tItem.stock !== null) {
      promesas.push(
        supabase.from('tienda_items').update({ stock: Math.max(0, tItem.stock - 1) }).eq('id', tItem.id)
      );
    }

    await Promise.all(promesas);
    await inventoryApi.agregarAInventario(personaje.id, tItem.item.id, 1);
    return true;
  },

  stockearTienda: async (tiendaId: string, itemId: string) => {
    const { data: existente } = await supabase
      .from('tienda_items')
      .select('id, stock')
      .eq('tienda_id', tiendaId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existente) {
      await supabase.from('tienda_items').update({ stock: (existente.stock || 0) + 1 }).eq('id', existente.id);
    } else {
      await supabase.from('tienda_items').insert([{ tienda_id: tiendaId, item_id: itemId, stock: 3 }]);
    }
  },

  modificarStockTienda: async (tiendaItemId: string, delta: number, stockActual: number | null) => {
    if (stockActual === null) return;
    const nuevo = Math.max(0, stockActual + delta);
    await supabase.from('tienda_items').update({ stock: nuevo }).eq('id', tiendaItemId);
  },

  eliminarDeTienda: async (tiendaItemId: string) => {
    await supabase.from('tienda_items').delete().eq('id', tiendaItemId);
  },

  toggleTiendaAbierta: async (tiendaId: string, actual: boolean) => {
    await supabase.from('tiendas').update({ abierta: !actual }).eq('id', tiendaId);
  },

  crearTienda: async (nombre: string, campanaId: string) => {
    const { error } = await supabase.from('tiendas').insert([{ 
      nombre: nombre.trim(), 
      abierta: true, 
      multiplicador_precio: 1.0,
      campana_id: campanaId // 👈 Toma la campaña que le pasa la vista en ese momento
    }]);
    if (error) throw error;
  },

  cargarSolicitudes: async (): Promise<SolicitudTienda[]> => {
    const { data } = await supabase
      .from('solicitudes_tienda')
      .select('*, personaje:personajes(*), tienda:tiendas(*), item:catalogo_items(*)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    return (data || []) as SolicitudTienda[];
  },

  crearSolicitud: async (payload: {
    personaje_id: string;
    tienda_id: string;
    item_id: string;
    tienda_item_id?: string;
    inventario_id?: string;
    tipo: 'compra' | 'venta';
    precio_cobre: number;
  }) => {
    const { error } = await supabase.from('solicitudes_tienda').insert([payload]);
    if (error) throw error;
  },

  aprobarSolicitudTienda: async (sol: SolicitudTienda) => {
    if (sol.tipo === 'compra') {
      const { data: p } = await supabase.from('personajes').select('*').eq('id', sol.personaje_id).single();
      if (!p || p.monedas_cobre < sol.precio_cobre) {
        alert('El jugador ya no tiene suficiente dinero.');
        return;
      }

      await supabase.from('personajes').update({ monedas_cobre: p.monedas_cobre - sol.precio_cobre }).eq('id', p.id);
      await inventoryApi.agregarAInventario(p.id, sol.item_id, sol.cantidad);

      if (sol.tienda_item_id) {
        const { data: ti } = await supabase.from('tienda_items').select('*').eq('id', sol.tienda_item_id).single();
        if (ti && ti.stock !== null) {
          await supabase.from('tienda_items').update({ stock: Math.max(0, ti.stock - 1) }).eq('id', ti.id);
        }
      }
    } else if (sol.tipo === 'venta') {
      const { data: p } = await supabase.from('personajes').select('*').eq('id', sol.personaje_id).single();
      if (!p) return;

      if (sol.inventario_id) {
        const { data: inv } = await supabase.from('inventarios').select('*').eq('id', sol.inventario_id).maybeSingle();
        if (inv) {
          if (inv.cantidad > 1) {
            await supabase.from('inventarios').update({ cantidad: inv.cantidad - 1 }).eq('id', inv.id);
          } else {
            await supabase.from('inventarios').delete().eq('id', inv.id);
          }
        }
      }

      await supabase.from('personajes').update({ monedas_cobre: p.monedas_cobre + sol.precio_cobre }).eq('id', p.id);
    }

    await supabase.from('solicitudes_tienda').delete().eq('id', sol.id);
  },

  rechazarSolicitudTienda: async (solicitudId: string) => {
    await supabase.from('solicitudes_tienda').delete().eq('id', solicitudId);
  },

  crearPersonaje: async (payload: {
    nombre: string;
    fuerza: number;
    monedas_cobre: number;
    campana_id: string;
  }) => {
    const { data, error } = await supabase
      .from('personajes')
      .insert([{
        nombre: payload.nombre.trim(),
        fuerza: payload.fuerza || 10,
        monedas_cobre: payload.monedas_cobre || 0,
        campana_id: payload.campana_id,
        baul_habilitado: false
      }])
      .select()
      .single();
    if (error) throw error;
    return data as Personaje;
  },
};