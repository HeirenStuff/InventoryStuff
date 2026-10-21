import React, { useState, useMemo } from 'react';
import type { Personaje, ItemInventario, ItemMesaComun, Tienda, SolicitudTienda } from '../types';
import { 
  inventoryApi, cobreAMonedas, formatearPrecio, ItemIcon 
} from '../services/inventoryApi';
import { getItemTypeClass } from '../../utils/itemTheme'; // Ajusta la ruta a tu utils/itemTheme
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-stone)] text-[var(--text-main)]">
      {/* HEADER JUGADOR */}
      <header className="p-4 bg-[var(--panel-dark)] border-b-2 border-[var(--accent-gold)] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-[var(--text-main)] tracking-wide">{personaje.nombre}</h1>
            <p className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono mt-0.5">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--accent-gold-dim)]" />
              <span>FUE {personaje.fuerza}</span>
              <span className={sobrecargado ? 'text-[#c25953] font-bold' : 'text-[var(--accent-gold)]'}>
                {pesoActual.toFixed(1)} / {pesoMaximo} lbs
              </span>
              {sobrecargado && (
                <span className="flex items-center gap-1 text-[#c25953] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Sobrecargado
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex" aria-label="Monedas">
              <div className="coin-chip cp border-r-0">
                <span className="text-[9px] uppercase tracking-wider font-bold">Oro</span>
                <span className="font-mono font-bold text-xs text-[var(--coin-gp)]">{monedasDesglose.oro}</span>
              </div>
              <div className="coin-chip sp border-r-0">
                <span className="text-[9px] uppercase tracking-wider font-bold">Plata</span>
                <span className="font-mono font-bold text-xs text-[var(--coin-sp)]">{monedasDesglose.plata}</span>
              </div>
              <div className="coin-chip gp">
                <span className="text-[9px] uppercase tracking-wider font-bold">Cobre</span>
                <span className="font-mono font-bold text-xs text-[var(--coin-cp)]">{monedasDesglose.cobre}</span>
              </div>
            </div>
            <button onClick={onSalir} title="Cambiar de personaje" className="btn-secondary min-w-9 px-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BARRA DE PESO */}
        <div className="max-w-6xl mx-auto w-full mt-3">
          <div className="w-full bg-[var(--bg-stone)] h-2 overflow-hidden border border-[var(--border-color)] rounded-xs">
            <div
              className={`h-full transition-all duration-300 ${
                sobrecargado 
                  ? 'bg-[#c25953] shadow-[0_0_8px_#c25953]' 
                  : pesoActual > pesoMaximo * 0.75 
                  ? 'bg-[var(--accent-gold)]' 
                  : 'bg-[#8ea35b]'
              }`}
              style={{ width: `${Math.min((pesoActual / pesoMaximo) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* NAVEGACIÓN MÓVIL */}
        <nav className="max-w-6xl mx-auto mt-3 grid grid-cols-3 border border-[var(--border-color)] lg:hidden rounded-xs overflow-hidden">
          {([
            ['inventario', 'Inventario'],
            ['mesa', 'Mesa'],
            ['tiendas', 'Tiendas'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanelMovil(id)}
              className={`min-h-10 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                panelMovil === id ? 'bg-[var(--accent-gold)] text-[#111]' : 'bg-[var(--panel)] text-[var(--text-muted)]'
              } ${id !== 'inventario' ? 'border-l border-[var(--border-color)]' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* CUERPO DEL INVENTARIO */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUMNA IZQUIERDA: MOCHILA Y BAÚL */}
        <section
          onDragOver={(e) => { e.preventDefault(); setHoverMochila(true); }}
          onDragLeave={() => setHoverMochila(false)}
          onDrop={handleDropEnMochila}
          className={`${panelMovil === 'inventario' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 rpg-panel flex-col space-y-3 transition-colors ${
            hoverMochila ? 'border-[var(--accent-gold)] shadow-[0_0_15px_rgba(209,177,129,0.2)]' : ''
          }`}
        >
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex border border-[var(--border-color)] rounded-xs overflow-hidden" role="tablist">
              <button
                onClick={() => setVistaJugadorTab('mochila')}
                className={`flex items-center gap-1.5 px-3 min-h-8 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  vistaJugadorTab === 'mochila' ? 'bg-[var(--accent-gold)] text-[#111]' : 'bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Mochila ({itemsMochila.length})
              </button>

              {personaje.baul_habilitado && (
                <button
                  onClick={() => setVistaJugadorTab('baul')}
                  className={`flex items-center gap-1.5 px-3 min-h-8 text-xs font-bold uppercase tracking-wider border-l border-[var(--border-color)] cursor-pointer transition-colors ${
                    vistaJugadorTab === 'baul' ? 'bg-[var(--accent-gold)] text-[#111]' : 'bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" /> Baúl ({itemsBaul.length})
                </button>
              )}

              <button
                onClick={() => setVistaJugadorTab('grupo')}
                className={`flex items-center gap-1.5 px-3 min-h-8 text-xs font-bold uppercase tracking-wider border-l border-[var(--border-color)] cursor-pointer transition-colors ${
                  vistaJugadorTab === 'grupo' ? 'bg-[var(--accent-gold)] text-[#111]' : 'bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Crown className="w-3.5 h-3.5" /> Compañeros
              </button>
            </div>

            <span className="text-[11px] text-[var(--text-muted)]">
              {vistaJugadorTab === 'baul' ? 'No suma peso' : 'Pulsa un objeto para detalles'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[560px] pr-1">
            {vistaJugadorTab === 'mochila' && (
              itemsMochila.length === 0 ? (
                <p className="text-center py-16 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)]">
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
                <p className="text-center py-16 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)]">
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
                      <div key={comp.id} className="p-3 border border-[var(--border-color)] bg-[var(--panel-dark)] rounded-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)] mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-[var(--text-main)]">{comp.nombre}</h4>
                            <p className="text-[11px] font-mono text-[var(--text-muted)]">
                              Carga: {compPeso.toFixed(1)} / {comp.fuerza * 15} lbs
                            </p>
                          </div>
                          <span className="text-xs font-mono text-[var(--accent-gold)] font-bold">
                            {compMonedas.oro} PO {compMonedas.plata > 0 ? `${compMonedas.plata} PP ` : ''}
                          </span>
                        </div>

                        {compItemsVisibles.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)] italic py-2 text-center">
                            No lleva objetos visibles en su mochila.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {compItemsVisibles.map(inv => {
                              const tipoClase = getItemTypeClass(inv.item);
                              return (
                                <div
                                  key={inv.id}
                                  className={`rpg-card ${tipoClase} p-2 text-xs flex flex-col justify-between ${
                                    inv.equipado ? 'ring-1 ring-[var(--accent-gold)]' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    {inv.equipado ? (
                                      <span className="text-[9px] font-bold text-[#111] bg-[var(--accent-gold)] px-1 rounded-xs">EQ</span>
                                    ) : <span />}
                                    <span className="font-mono text-[var(--accent-gold)] font-bold">x{inv.cantidad}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 my-1">
                                    <ItemIcon name={inv.item.icono} className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                                    <span className="truncate font-semibold text-[var(--text-main)]">{inv.item.nombre}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                    {(inv.item.peso * inv.cantidad).toFixed(1)} lbs
                                  </span>
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
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="section-title flex items-center gap-2 !mb-0 !border-b-0">
                  <Store className="w-4 h-4 text-[var(--accent-gold)]" /> Mercaderes
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Arrastra un objeto para solicitar su venta al 50%.</p>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--accent-gold)] border border-[var(--border-color)] bg-[var(--panel-dark)] px-2 py-0.5 rounded-xs">
                {tiendasAbiertas.length}
              </span>
            </div>

            {/* Aviso de peticiones pendientes */}
            {solicitudes.filter(s => s.personaje_id === personaje.id).length > 0 && (
              <div className="p-2 border border-[var(--accent-gold)] bg-[var(--panel-dark)] text-xs text-[var(--accent-gold)] flex items-center gap-2 rounded-xs">
                <Clock className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
                <span>Tienes transacciones pendientes de autorización por el DM.</span>
              </div>
            )}

            {tiendasAbiertas.length === 0 ? (
              <p className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)]">
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
                      className={`p-3 border rounded-xs transition-colors ${
                        isHovered ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-[0_0_15px_rgba(209,177,129,0.2)]' : 'bg-[var(--panel-dark)] border-[var(--border-color)]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-[var(--accent-gold)]" />
                          <h4 className="font-bold text-sm text-[var(--text-main)]">{t.nombre}</h4>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {isHovered ? '¡Suelta aquí para negociar venta!' : 'Arrastra objetos aquí para vender'}
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] py-2 text-center">Sin artículos en venta.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map(ti => {
                            const mult = typeof t.multiplicador_precio === 'number' && t.multiplicador_precio > 0 ? t.multiplicador_precio : 1.0;
                            const precioBase = ti.precio_cobre_override ?? ti.item.precio_cobre;
                            const precioTotal = Math.round(precioBase * mult);
                            const saldoActual = personaje.monedas_cobre || 0;
                            const puedeComprar = saldoActual >= precioTotal && (ti.stock === null || ti.stock > 0);
                            const tipoClase = getItemTypeClass(ti.item);

                            return (
                              <div
                                key={ti.id}
                                className={`rpg-card ${tipoClase} flex items-center justify-between gap-2 p-2`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1 rounded-xs bg-[var(--panel-dark)] border border-[var(--border-color)] shrink-0">
                                    <ItemIcon name={ti.item.icono} className="w-4 h-4 text-[var(--accent-gold)]" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-xs text-[var(--text-main)] truncate">{ti.item.nombre}</p>
                                    <p className="text-[11px] text-[var(--accent-gold)] font-mono">
                                      {formatearPrecio(precioTotal)}
                                      <span className="text-[var(--text-muted)] ml-1.5">· {ti.stock ?? '∞'}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
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
                                    className="btn-primary py-1 px-2.5 text-xs"
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

      {/* MODAL DE NEGOCIACIÓN / REGATEO CON SLIDER */}
      {negociacion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-4 border-2 border-[var(--accent-gold)] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div className="border-b border-[var(--border-color)] pb-2 flex justify-between items-center">
              <h3 className="section-title text-sm flex items-center gap-1.5 !mb-0 !border-b-0">
                <ShoppingBag className="w-4 h-4 text-[var(--accent-gold)]" />
                {negociacion.tipo === 'compra' ? 'Regatear Compra' : 'Negociar Venta'}
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 uppercase bg-[var(--panel-dark)] text-[var(--accent-gold)] border border-[var(--border-color)] rounded-xs">
                {negociacion.tiendaNombre}
              </span>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-[var(--panel-dark)] border border-[var(--border-color)] rounded-xs">
              <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-stone)] text-[var(--accent-gold)] rounded-xs">
                <ItemIcon name={negociacion.item.icono} className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-[var(--text-main)] truncate">{negociacion.item.nombre}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {negociacion.tipo === 'compra' ? 'Precio de lista: ' : 'Precio habitual (50%): '}
                  <strong className="text-[var(--accent-gold)] font-mono">{formatearPrecio(negociacion.precioBaseCobre)}</strong>
                </p>
              </div>
            </div>

            {/* SECCIÓN DEL SLIDER Y VALOR OFERTADO */}
            <div className="space-y-3 bg-[var(--panel-dark)] p-3 border border-[var(--border-color)] rounded-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] uppercase tracking-wider font-bold">Tu oferta:</span>
                <span className="font-mono font-bold text-sm text-[var(--accent-gold)]">
                  {formatearPrecio(ofertaCobre)}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.round(negociacion.precioBaseCobre * 2)}
                step={Math.max(1, Math.round(negociacion.precioBaseCobre * 0.05))}
                value={ofertaCobre}
                onChange={(e) => setOfertaCobre(Number(e.target.value))}
                className="w-full cursor-pointer accent-[var(--accent-gold)]"
              />

              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>0% (Gratis)</span>
                <span>100% (Base)</span>
                <span>200% (Doble)</span>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">Ajustar en Oro (PO):</span>
                <input
                  type="number"
                  min="0"
                  value={Math.floor(ofertaCobre / 100)}
                  onChange={(e) => {
                    const po = Math.max(0, parseInt(e.target.value) || 0);
                    setOfertaCobre(po * 100 + (ofertaCobre % 100));
                  }}
                  className="w-24 rpg-input text-center font-mono font-bold text-xs text-[var(--accent-gold)]"
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