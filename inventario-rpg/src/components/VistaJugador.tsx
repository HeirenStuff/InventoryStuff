import React, { useState, useMemo } from 'react';
import type { Personaje, ItemInventario, ItemMesaComun, Tienda, SolicitudTienda } from '../types';
import { 
  inventoryApi, cobreAMonedas, formatearPrecio, ItemIcon 
} from '../services/inventoryApi';
import { ItemTile } from './ItemTile';
import { MesaComun } from './MesaComun';
import { 
  Crown, Store, LogOut, Dumbbell, ShieldAlert, ShoppingBag, Archive, Package, Clock 
} from 'lucide-react';

interface Props {
  personaje: Personaje;
  personajes: Personaje[];
  inventario: ItemInventario[];
  setInventario: React.Dispatch<React.SetStateAction<ItemInventario[]>>;
  itemsMesa: ItemMesaComun[];
  setItemsMesa: React.Dispatch<React.SetStateAction<ItemMesaComun[]>>;
  tiendas: Tienda[];
  solicitudes: SolicitudTienda[];
  inventariosGrupo: ItemInventario[];
  onRecargar: () => void;
  onSalir: () => void;
}

export const VistaJugador: React.FC<Props> = ({
  personaje,
  personajes,
  inventario,
  setInventario,
  itemsMesa,
  setItemsMesa,
  tiendas,
  solicitudes,
  inventariosGrupo,
  onRecargar,
  onSalir,
}) => {
  const [vistaJugadorTab, setVistaJugadorTab] = useState<'mochila' | 'baul' | 'grupo'>('mochila');
  const [panelMovil, setPanelMovil] = useState<'inventario' | 'mesa' | 'tiendas'>('inventario');
  const [hoverMochila, setHoverMochila] = useState(false);
  const [hoverTiendaId, setHoverTiendaId] = useState<string | null>(null);
  // Estado para modal de negociación / regateo (Compra y Venta)
  const [negociacion, setNegociacion] = useState<{
    tipo: 'compra' | 'venta';
    tiendaId: string;
    tiendaNombre: string;
    item: { id: string; nombre: string; icono: string; precio_cobre: number };
    tiendaItemId?: string;
    inventarioId?: string;
    precioBaseCobre: number;
  } | null>(null);

  const [ofertaCobre, setOfertaCobre] = useState<number>(0);

  const itemsMochila = useMemo(() => {
    return inventario
      .filter(i => !i.en_baul)
      .sort((a, b) => (b.equipado ? 1 : 0) - (a.equipado ? 1 : 0));
  }, [inventario]);

  const itemsBaul = useMemo(() => {
    return inventario.filter(i => i.en_baul);
  }, [inventario]);

  const pesoActual = useMemo(() => itemsMochila.reduce((t, i) => t + ((i.item?.peso || 0) * i.cantidad), 0), [itemsMochila]);
  const pesoMaximo = (personaje?.fuerza || 10) * 15;
  const sobrecargado = pesoActual > pesoMaximo;
  const tiendasAbiertas = useMemo(() => tiendas.filter(t => t.abierta), [tiendas]);
  const monedasDesglose = cobreAMonedas(personaje?.monedas_cobre || 0);

  // Handlers D&D
  const handleDropEnMesa = async (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (data.tipo === 'mochila') {
        const inv = inventario.find(i => i.id === data.inventarioId);
        if (!inv) return;

        setInventario(prev =>
          inv.cantidad > 1
            ? prev.map(item => item.id === inv.id ? { ...item, cantidad: item.cantidad - 1 } : item)
            : prev.filter(item => item.id !== inv.id)
        );

        setItemsMesa(prev => {
          const yaExiste = prev.find(m => !m.es_bolsa_monedas && m.item_id === inv.item.id);
          if (yaExiste) {
            return prev.map(m => m.id === yaExiste.id ? { ...m, cantidad: m.cantidad + 1 } : m);
          }
          return [...prev, {
            id: `temp-${Date.now()}`,
            item_id: inv.item.id,
            cantidad: 1,
            creado_por: personaje.nombre,
            es_bolsa_monedas: false,
            item: inv.item,
          }];
        });

        // 👉 AQUÍ: enviamos la campaña del personaje
        const campanaPj = (personaje as any).campana_id || '01';
        await inventoryApi.soltarEnMesa(personaje.nombre, inv, 1, campanaPj);
        onRecargar();
      }
    } catch (err) { console.error(err); }
  };

  const handleTomarDeMesa = async (mItem: ItemMesaComun) => {
    if (!mItem.item_id) return;

    setItemsMesa(prev =>
      mItem.cantidad > 1
        ? prev.map(m => m.id === mItem.id ? { ...m, cantidad: m.cantidad - 1 } : m)
        : prev.filter(m => m.id !== mItem.id)
    );

    setInventario(prev => {
      const yaExiste = prev.find(i => i.item_id === mItem.item_id && !i.equipado && !i.es_secreto && !i.en_baul);
      if (yaExiste) {
        return prev.map(i => i.id === yaExiste.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        id: `temp-inv-${Date.now()}`,
        personaje_id: personaje.id,
        item_id: mItem.item_id!,
        cantidad: 1,
        equipado: false,
        es_secreto: false,
        en_baul: false,
        item: mItem.item!,
      }];
    });

    await inventoryApi.tomarDeMesa(personaje.id, mItem);
    onRecargar();
  };

  const handleDropEnMochila = async (e: React.DragEvent) => {
    e.preventDefault();
    setHoverMochila(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (data.tipo === 'mesa') {
        const mItem = itemsMesa.find(i => i.id === data.mesaItemId);
        if (mItem) await handleTomarDeMesa(mItem);
      }
    } catch (err) { console.error(err); }
  };

  const handleDropVenderEnTienda = (e: React.DragEvent, targetTiendaId: string) => {
    e.preventDefault();
    setHoverTiendaId(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (data.tipo === 'mochila') {
        const inv = inventario.find(i => i.id === data.inventarioId);
        const tiendaDestino = tiendas.find(t => t.id === targetTiendaId);
        if (!inv || !tiendaDestino) return;

        const precioBase = Math.round(inv.item.precio_cobre * 0.5);

        setNegociacion({
          tipo: 'venta',
          tiendaId: tiendaDestino.id,
          tiendaNombre: tiendaDestino.nombre,
          item: inv.item,
          inventarioId: inv.id,
          precioBaseCobre: precioBase,
        });
        setOfertaCobre(precioBase);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmarNegociacion = async () => {
    if (!negociacion) return;

    if (negociacion.tipo === 'compra' && personaje.monedas_cobre < ofertaCobre) {
      alert('No tienes suficientes monedas para hacer esa oferta.');
      return;
    }

    await inventoryApi.crearSolicitud({
      personaje_id: personaje.id,
      tienda_id: negociacion.tiendaId,
      item_id: negociacion.item.id,
      tienda_item_id: negociacion.tiendaItemId,
      inventario_id: negociacion.inventarioId,
      tipo: negociacion.tipo,
      precio_cobre: Math.max(0, ofertaCobre),
    });

    setNegociacion(null);
    onRecargar();
  };


  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-[#eceef2]">
      {/* HEADER JUGADOR */}
      <header className="p-4 bg-[#101218] border-b border-[#2c303a] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-semibold text-lg text-[#eceef2]">{personaje.nombre}</h1>
            <p className="text-sm text-[#9aa1ae] flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono mt-0.5">
              <Dumbbell className="w-4 h-4 text-[#6d7380]" />
              <span>FUE {personaje.fuerza}</span>
              <span className={sobrecargado ? 'text-[#d98989] font-bold' : ''}>
                {pesoActual.toFixed(1)} / {pesoMaximo} lbs
              </span>
              {sobrecargado && (
                <span className="flex items-center gap-1 text-[#d98989] font-bold">
                  <ShieldAlert className="w-4 h-4" /> Sobrecargado
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex" aria-label="Monedas">
              <div className="coin-chip border-r-0">
                <span className="text-[10px] uppercase tracking-wider text-[#9aa1ae]">Oro</span>
                <span className="font-mono font-bold text-[#d4b978]">{monedasDesglose.oro}</span>
              </div>
              <div className="coin-chip border-r-0">
                <span className="text-[10px] uppercase tracking-wider text-[#9aa1ae]">Plata</span>
                <span className="font-mono font-bold text-[#d5dae3]">{monedasDesglose.plata}</span>
              </div>
              <div className="coin-chip">
                <span className="text-[10px] uppercase tracking-wider text-[#9aa1ae]">Cobre</span>
                <span className="font-mono font-bold text-[#b08968]">{monedasDesglose.cobre}</span>
              </div>
            </div>
            <button onClick={onSalir} title="Cambiar de personaje" className="btn-secondary min-w-9 px-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full mt-3">
          <div className="w-full bg-[#07080b] h-2 overflow-hidden border border-[#2c303a]">
            <div
              className={`h-full ${sobrecargado ? 'bg-[#d98989]' : pesoActual > pesoMaximo * 0.75 ? 'bg-[#d4b978]' : 'bg-[#7dba9a]'}`}
              style={{ width: `${Math.min((pesoActual / pesoMaximo) * 100, 100)}%` }}
            />
          </div>
        </div>

        <nav className="max-w-6xl mx-auto mt-3 grid grid-cols-3 border border-[#2c303a] lg:hidden">
          {([
            ['inventario', 'Inventario'],
            ['mesa', 'Mesa'],
            ['tiendas', 'Tiendas'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanelMovil(id)}
              className={`min-h-11 text-sm font-semibold ${
                panelMovil === id ? 'bg-[#9bb6cc] text-[#0b1016]' : 'bg-[#0c0e13] text-[#9aa1ae]'
              } ${id !== 'inventario' ? 'border-l border-[#2c303a]' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* CUERPO DEL INVENTARIO */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section
          onDragOver={(e) => { e.preventDefault(); setHoverMochila(true); }}
          onDragLeave={() => setHoverMochila(false)}
          onDrop={handleDropEnMochila}
          className={`${panelMovil === 'inventario' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 rpg-panel flex-col space-y-3 ${
            hoverMochila ? 'border-[#7dba9a] bg-[#101816]' : ''
          }`}
        >
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex border border-[#2c303a]" role="tablist">
              <button
                onClick={() => setVistaJugadorTab('mochila')}
                className={`flex items-center gap-1.5 px-3 min-h-10 text-sm font-semibold ${
                  vistaJugadorTab === 'mochila' ? 'bg-[#9bb6cc] text-[#0b1016]' : 'bg-[#0c0e13] text-[#9aa1ae] hover:text-[#eceef2]'
                }`}
              >
                <Package className="w-4 h-4" /> Mochila ({itemsMochila.length})
              </button>

              {personaje.baul_habilitado && (
                <button
                  onClick={() => setVistaJugadorTab('baul')}
                  className={`flex items-center gap-1.5 px-3 min-h-10 text-sm font-semibold border-l border-[#2c303a] ${
                    vistaJugadorTab === 'baul' ? 'bg-[#9bb6cc] text-[#0b1016]' : 'bg-[#0c0e13] text-[#9aa1ae] hover:text-[#eceef2]'
                  }`}
                >
                  <Archive className="w-4 h-4" /> Baúl ({itemsBaul.length})
                </button>
              )}

              <button
                onClick={() => setVistaJugadorTab('grupo')}
                className={`flex items-center gap-1.5 px-3 min-h-10 text-sm font-semibold border-l border-[#2c303a] ${
                  vistaJugadorTab === 'grupo' ? 'bg-[#9bb6cc] text-[#0b1016]' : 'bg-[#0c0e13] text-[#9aa1ae] hover:text-[#eceef2]'
                }`}
              >
                <Crown className="w-4 h-4" /> Compañeros
              </button>
            </div>

            <span className="text-xs text-[#9aa1ae]">
              {vistaJugadorTab === 'baul' ? 'No suma peso' : 'Pulsa un objeto para ver detalles'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[560px] pr-1">
            {vistaJugadorTab === 'mochila' && (
              itemsMochila.length === 0 ? (
                <p className="text-center py-16 text-sm text-[#9aa1ae] border border-dashed border-[#2c303a]">
                  Mochila vacía. Toma objetos de la mesa o cómpralos en las tiendas.
                </p>
              ) : (
                <div className="slot-grid">
                  {itemsMochila.map(inv => (
                    <ItemTile
                      key={inv.id}
                      inv={inv}
                      baulHabilitado={!!personaje.baul_habilitado}
                      onToggleEquipar={(id) => inventoryApi.toggleEquipar(id, inv.equipado).then(onRecargar)}
                      onToggleSecreto={(id) => inventoryApi.toggleSecreto(id, inv.es_secreto).then(onRecargar)}
                      onMoverBaul={(id, enBaul) => inventoryApi.moverABaul(id, enBaul).then(onRecargar)}
                    />
                  ))}
                </div>
              )
            )}

            {vistaJugadorTab === 'baul' && (
              itemsBaul.length === 0 ? (
                <p className="text-center py-16 text-sm text-[#9aa1ae] border border-dashed border-[#2c303a]">
                  Baúl vacío. Usa el icono de cofre en un objeto de la mochila para guardarlo aquí.
                </p>
              ) : (
                <div className="slot-grid">
                  {itemsBaul.map(inv => (
                    <ItemTile
                      key={inv.id}
                      inv={inv}
                      baulHabilitado={true}
                      onToggleEquipar={(id) => inventoryApi.toggleEquipar(id, inv.equipado).then(onRecargar)}
                      onToggleSecreto={(id) => inventoryApi.toggleSecreto(id, inv.es_secreto).then(onRecargar)}
                      onMoverBaul={(id, enBaul) => inventoryApi.moverABaul(id, enBaul).then(onRecargar)}
                    />
                  ))}
                </div>
              )
            )}

            {vistaJugadorTab === 'grupo' && (
              <div className="space-y-4">
                {personajes
                  .filter(p => p.id !== personaje.id)
                  .map(comp => {
                    const compMonedas = cobreAMonedas(comp.monedas_cobre);
                    const compItemsVisibles = inventariosGrupo.filter(
                      i => i.personaje_id === comp.id && !i.es_secreto && !i.en_baul
                    );
                    const compPeso = compItemsVisibles.reduce(
                      (acc, i) => acc + ((i.item?.peso || 0) * i.cantidad), 0
                    );

                    return (
                      <div key={comp.id} className="p-3 border border-[#2c303a] bg-[#0c0e13]">
                        <div className="flex justify-between items-center pb-2 border-b border-[#2c303a] mb-2">
                          <div>
                            <h4 className="font-semibold text-sm text-[#eceef2]">{comp.nombre}</h4>
                            <p className="text-xs font-mono text-[#9aa1ae]">
                              Carga: {compPeso.toFixed(1)} / {comp.fuerza * 15} lbs
                            </p>
                          </div>
                          <span className="text-xs font-mono text-[#d4b978] font-bold">
                            {compMonedas.oro} PO {compMonedas.plata > 0 ? `${compMonedas.plata} PP ` : ''}
                          </span>
                        </div>

                        {compItemsVisibles.length === 0 ? (
                          <p className="text-xs text-[#9aa1ae] italic py-2 text-center">
                            No lleva objetos visibles en su mochila.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {compItemsVisibles.map(inv => (
                              <div
                                key={inv.id}
                                className={`p-2 border text-xs flex flex-col justify-between ${
                                  inv.equipado ? 'border-[#9bb6cc] bg-[#12161c]' : 'border-[#2c303a] bg-[#101218]'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  {inv.equipado ? (
                                    <span className="text-[10px] font-bold text-[#0b1016] bg-[#9bb6cc] px-1">EQ</span>
                                  ) : <span />}
                                  <span className="font-mono text-[#eceef2] font-bold">x{inv.cantidad}</span>
                                </div>
                                <div className="flex items-center gap-1.5 my-1">
                                  <ItemIcon name={inv.item.icono} className="w-4 h-4 text-[#c5d4e4] shrink-0" />
                                  <span className="truncate font-medium text-[#eceef2]">{inv.item.nombre}</span>
                                </div>
                                <span className="text-[11px] font-mono text-[#9aa1ae]">
                                  {(inv.item.peso * inv.cantidad).toFixed(1)} lbs
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: MESA + TIENDAS */}
        <div className={`${panelMovil === 'inventario' ? 'hidden' : 'flex'} lg:flex lg:col-span-5 flex-col space-y-4`}>
          <div className={`${panelMovil === 'mesa' ? 'block' : 'hidden'} lg:block`}>
            <MesaComun
              itemsMesa={itemsMesa}
              personajeActual={personaje}
              onDropEnMesa={handleDropEnMesa}
              onTomarItem={handleTomarDeMesa}
              onTomarBolsa={(bolsa, cant) => inventoryApi.tomarBolsaMonedas(personaje, bolsa, cant).then(onRecargar)}
              onRepartirBolsa={(bolsa) => inventoryApi.repartirBolsaMonedas(bolsa, personajes).then(onRecargar)}
            />
          </div>

          <div className={`${panelMovil === 'tiendas' ? 'block' : 'hidden'} lg:block rpg-panel space-y-3`}>
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#2c303a] pb-3">
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <Store className="w-4 h-4" /> Mercaderes
                </h3>
                <p className="text-xs text-[#9aa1ae] mt-1">Arrastra un objeto para solicitar su venta al 50%.</p>
              </div>
              <span className="text-sm font-mono border border-[#2c303a] px-2 py-1">{tiendasAbiertas.length}</span>
            </div>

            {/* Aviso de peticiones pendientes */}
            {solicitudes.filter(s => s.personaje_id === personaje.id).length > 0 && (
              <div className="p-2 border border-[#9bb6cc] bg-[#10141a] text-xs text-[#c5d4e4] flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-[#9bb6cc]" />
                <span>Tienes transacciones pendientes de autorización por el DM.</span>
              </div>
            )}

            {tiendasAbiertas.length === 0 ? (
              <p className="text-center py-6 text-sm text-[#9aa1ae] border border-dashed border-[#2c303a]">
                No hay mercaderes abiertos.
              </p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {tiendasAbiertas.map(t => {
                  const items = t.items || [];
                  const isHovered = hoverTiendaId === t.id;

                  return (
                    <div
                      key={t.id}
                      onDragOver={(e) => { e.preventDefault(); setHoverTiendaId(t.id); }}
                      onDragLeave={() => setHoverTiendaId(null)}
                      onDrop={(e) => handleDropVenderEnTienda(e, t.id)}
                      className={`p-3 border transition-colors ${
                        isHovered ? 'border-[#d4b978] bg-[#16140f]' : 'bg-[#0c0e13] border-[#2c303a]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#2c303a]">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-[#7dba9a]" />
                          <h4 className="font-semibold text-sm text-[#eceef2]">{t.nombre}</h4>
                        </div>
                        <span className="text-xs text-[#9aa1ae]">
                          {isHovered ? '¡Suelta aquí para negociar venta!' : 'Arrastra objetos aquí para vender'}
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-sm text-[#9aa1ae] py-2 text-center">Sin artículos en venta.</p>
                      ) : (
                        <div className="space-y-1">
                          {items.map(ti => {
                            const mult = typeof t.multiplicador_precio === 'number' && t.multiplicador_precio > 0 ? t.multiplicador_precio : 1.0;
                            const precioBase = ti.precio_cobre_override ?? ti.item.precio_cobre;
                            const precioTotal = Math.round(precioBase * mult);
                            const saldoActual = personaje.monedas_cobre || 0;
                            const puedeComprar = saldoActual >= precioTotal && (ti.stock === null || ti.stock > 0);

                            return (
                              <div
                                key={ti.id}
                                className="flex items-center justify-between gap-2 p-2 bg-[#101218] border border-[#2c303a]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <ItemIcon name={ti.item.icono} className="w-5 h-5 text-[#c5d4e4] shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm text-[#eceef2] truncate">{ti.item.nombre}</p>
                                    <p className="text-xs text-[#d4b978] font-mono">
                                      {formatearPrecio(precioTotal)}
                                      <span className="text-[#9aa1ae] ml-1.5">· {ti.stock ?? '∞'}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Botón para abrir regateo de compra con slider */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNegociacion({
                                        tipo: 'compra',
                                        tiendaId: t.id,
                                        tiendaNombre: t.nombre,
                                        item: ti.item,
                                        tiendaItemId: ti.id,
                                        precioBaseCobre: precioTotal,
                                      });
                                      setOfertaCobre(precioTotal);
                                    }}
                                    className="btn-secondary py-1 px-2 text-xs"
                                    title="Regatear precio de compra"
                                  >
                                    Regatear
                                  </button>

                                  {/* Compra directa al precio oficial */}
                                  <button
                                    disabled={!puedeComprar}
                                    onClick={async () => {
                                      await inventoryApi.crearSolicitud({
                                        personaje_id: personaje.id,
                                        tienda_id: t.id,
                                        item_id: ti.item.id,
                                        tienda_item_id: ti.id,
                                        tipo: 'compra',
                                        precio_cobre: precioTotal,
                                      });
                                      onRecargar();
                                    }}
                                    className="btn-success py-1 px-2.5 text-xs"
                                  >
                                    {puedeComprar ? 'Comprar' : 'Sin oro'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE NEGOCIACIÓN / REGATEO CON SLIDER (COMPRA Y VENTA) */}
      {negociacion && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-4">
            <div className="border-b border-[#2c303a] pb-2 flex justify-between items-center">
              <h3 className="section-title text-sm flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#d4b978]" />
                {negociacion.tipo === 'compra' ? 'Regatear Compra' : 'Negociar Venta'}
              </h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 uppercase ${
                negociacion.tipo === 'compra' ? 'bg-[#1a2a22] text-[#7dba9a]' : 'bg-[#2a1e14] text-[#d4b978]'
              }`}>
                {negociacion.tiendaNombre}
              </span>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-[#0c0e13] border border-[#2c303a]">
              <div className="p-2 border border-[#2c303a] bg-[#07080b] text-[#c5d4e4]">
                <ItemIcon name={negociacion.item.icono} className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-[#eceef2] truncate">{negociacion.item.nombre}</p>
                <p className="text-xs text-[#9aa1ae]">
                  {negociacion.tipo === 'compra' ? 'Precio de lista: ' : 'Precio habitual (50%): '}
                  <strong className="text-[#eceef2]">{formatearPrecio(negociacion.precioBaseCobre)}</strong>
                </p>
              </div>
            </div>

            {/* SECCIÓN DEL SLIDER Y VALOR OFERTADO */}
            <div className="space-y-3 bg-[#0c0e13] p-3 border border-[#2c303a]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#9aa1ae] uppercase tracking-wider font-semibold">Tu oferta propuesta:</span>
                <span className="font-mono font-bold text-sm text-[#d4b978]">
                  {formatearPrecio(ofertaCobre)}
                </span>
              </div>

              {/* Slider de porcentaje interactivo (desde 10% hasta 200% del valor base) */}
              <input
                type="range"
                min={Math.max(1, Math.round(negociacion.precioBaseCobre * 0.2))}
                max={Math.round(negociacion.precioBaseCobre * 1.8)}
                step={Math.max(1, Math.round(negociacion.precioBaseCobre * 0.05))}
                value={ofertaCobre}
                onChange={(e) => setOfertaCobre(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#d4b978]"
              />

              <div className="flex justify-between text-[11px] text-[#9aa1ae] font-mono">
                <span>Más barato (-80%)</span>
                <span>Base</span>
                <span>Más caro (+80%)</span>
              </div>

              {/* Input numérico directo por si quieren ajustar en Piezas de Oro exactas */}
              <div className="pt-2 border-t border-[#2c303a] flex items-center justify-between gap-2">
                <span className="text-xs text-[#9aa1ae]">Ajustar en Oro (PO):</span>
                <input
                  type="number"
                  min="0"
                  value={Math.floor(ofertaCobre / 100)}
                  onChange={(e) => {
                    const po = Math.max(0, parseInt(e.target.value) || 0);
                    setOfertaCobre(po * 100 + (ofertaCobre % 100));
                  }}
                  className="w-24 rpg-input text-center font-mono font-bold text-xs text-[#d4b978]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNegociacion(null)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarNegociacion}
                className="btn-primary text-xs"
              >
                Enviar al DM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};