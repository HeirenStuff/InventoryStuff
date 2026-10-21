import React, { useState } from 'react';
import type { Personaje, ItemInventario, ItemCatalogo, ItemMesaComun, Tienda, SolicitudTienda } from '../types';
import { 
  inventoryApi, cobreAMonedas, monedasACobre, formatearPrecio, ItemIcon, supabase 
} from '../services/inventoryApi';
import { MesaComun } from './MesaComun';
import { StoreCard } from './StoreCard';
import { 
  Crown, Globe, Backpack, LogOut, Plus, Edit2, Send, Trash2, ArrowRight, 
  Coins, Archive, Minus, Sparkles, X, Check, XCircle, Clock, Copy, User 
} from 'lucide-react';

const ICONOS_DISPONIBLES = [
  'sword', 'shield', 'flask-round', 'scroll', 'gem', 'wrench', 'package', 'utensils', 'coins'
];

interface FormItemState {
  id?: string;
  nombre: string;
  categoria: string;
  peso: number;
  oro: number;
  plata: number;
  cobre: number;
  descripcion: string;
  icono: string;
}

interface Props {
  campanas: { id: string; nombre: string }[];
  campanaActivaId: string;
  onCambiarCampana: (id: string) => void;
  catalogo: ItemCatalogo[];
  personajes: Personaje[];
  setPersonajes: React.Dispatch<React.SetStateAction<Personaje[]>>;
  inventariosGrupo: ItemInventario[];
  itemsMesa: ItemMesaComun[];
  tiendas: Tienda[];
  solicitudes: SolicitudTienda[];
  onRecargar: () => void;
  onSalir: () => void;
}

export const VistaDM: React.FC<Props> = ({
  campanas,
  campanaActivaId,
  onCambiarCampana,
  catalogo,
  personajes,
  setPersonajes,
  inventariosGrupo,
  itemsMesa,
  tiendas,
  solicitudes,
  onRecargar,
  onSalir,
}) => {
  const [dmTab, setDmTab] = useState<'mundo' | 'mochilas'>('mundo');
  const [hoverPersonajeId, setHoverPersonajeId] = useState<string | null>(null);
  const [itemAEnviar, setItemAEnviar] = useState<ItemCatalogo | null>(null);
  const [modalItemDM, setModalItemDM] = useState<{ abierto: boolean; modo: 'crear' | 'editar'; item: FormItemState } | null>(null);

  // Modal para copiar links con alias
  const [modalLinksJugadores, setModalLinksJugadores] = useState(false);

  const [filtroCat, setFiltroCat] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [dmOro, setDmOro] = useState(50);
  const [dmPlata, setDmPlata] = useState(0);
  const [dmCobre, setDmCobre] = useState(0);
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState('');

  const catalogoFiltrado = catalogo.filter(i => 
    (filtroCat === 'todos' || i.categoria === filtroCat) && 
    i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const copiarEnlacePersonaje = (nombrePj?: string) => {
    let link = `${window.location.origin}${window.location.pathname}?campana=${campanaActivaId}`;
    if (nombrePj) {
      link += `&personaje=${encodeURIComponent(nombrePj)}`;
    } else {
      link += `&rol=jugador`;
    }
    navigator.clipboard.writeText(link);
    alert(`¡Enlace copiado al portapapeles!\n\n${link}`);
    setModalLinksJugadores(false);
  };

  const handleDropItemAJugadorDM = async (e: React.DragEvent, personajeId: string) => {
    e.preventDefault();
    setHoverPersonajeId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (data.tipo === 'catalogo' && data.itemId) {
        await inventoryApi.agregarAInventario(personajeId, data.itemId, 1);
        onRecargar();
      }
    } catch (err) { console.error(err); }
  };

  const handleGuardarItemDM = async (comoUnico = false) => {
    if (!modalItemDM) return;
    const { modo, item } = modalItemDM;
    if (!item.nombre.trim()) return alert('Ingresa un nombre');

    const totalCobre = monedasACobre(item.oro, item.plata, item.cobre);
    const payload = {
      nombre: item.nombre.trim(),
      categoria: item.categoria,
      peso: Number(item.peso) || 0,
      precio_cobre: totalCobre,
      descripcion: item.descripcion.trim(),
      icono: item.icono,
    };

    try {
      if (modo === 'crear' || comoUnico) {
        await inventoryApi.crearItemCatalogo(payload);
      } else if (modo === 'editar' && item.id) {
        await inventoryApi.actualizarItemCatalogo(item.id, payload);
      }
      setModalItemDM(null);
      onRecargar();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el objeto.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-[#eceef2]">
      {/* HEADER DM */}
      <header className="px-4 lg:px-6 py-3 bg-[#101218] border-b border-[#2c303a] flex flex-wrap justify-between items-center gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-semibold text-sm text-[#c5d4e4] flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#9bb6cc]" /> Panel DM
          </h1>

          <select
            value={campanaActivaId}
            onChange={(e) => onCambiarCampana(e.target.value)}
            className="rpg-input text-xs py-1 px-2 border-[#3a4a5c]"
          >
            {campanas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <div className="flex items-center border border-[#2c303a]" role="tablist">
            <button
              onClick={() => setDmTab('mundo')}
              className={`flex items-center gap-1.5 px-3 min-h-9 text-sm font-semibold ${
                dmTab === 'mundo' ? 'bg-[#9bb6cc] text-[#0b1016]' : 'text-[#9aa1ae] hover:text-[#eceef2] bg-[#0c0e13]'
              }`}
            >
              <Globe className="w-4 h-4" /> Mesa y tiendas
            </button>
            <button
              onClick={() => { setDmTab('mochilas'); onRecargar(); }}
              className={`flex items-center gap-1.5 px-3 min-h-9 text-sm font-semibold border-l border-[#2c303a] ${
                dmTab === 'mochilas' ? 'bg-[#9bb6cc] text-[#0b1016]' : 'text-[#9aa1ae] hover:text-[#eceef2] bg-[#0c0e13]'
              }`}
            >
              <Backpack className="w-4 h-4" /> Mochilas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* EL MISMO BOTÓN DE SIEMPRE: AHORA ABRE LA VENTANA DE SELECCIÓN CON ALIAS */}
          <button 
            onClick={() => setModalLinksJugadores(true)} 
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Copiar links para los jugadores"
          >
            <Copy className="w-3.5 h-3.5 text-[#7dba9a]" /> Copiar Link Jugadores
          </button>
          
          <button onClick={onSalir} className="btn-secondary">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      {/* MODAL PARA COPIAR ENLACES CON ALIAS */}
      {modalLinksJugadores && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-[#2c303a] pb-2">
              <h3 className="font-semibold text-sm text-[#eceef2] flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#7dba9a]" /> Enlaces para Jugadores
              </h3>
              <button onClick={() => setModalLinksJugadores(false)}><X className="w-4 h-4 text-[#9aa1ae]" /></button>
            </div>

            <p className="text-xs text-[#9aa1ae]">
              Toca un personaje para copiar su enlace directo personal:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {personajes.length === 0 ? (
                <p className="text-xs text-center py-4 text-[#9aa1ae]">No hay personajes creados todavía.</p>
              ) : (
                personajes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => copiarEnlacePersonaje(p.nombre)}
                    className="w-full flex items-center justify-between p-2.5 bg-[#0c0e13] hover:bg-[#161920] border border-[#2c303a] text-left hover:border-[#7dba9a] text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#9bb6cc]" />
                      <span className="font-semibold text-[#eceef2]">{p.nombre}</span>
                    </div>
                    <span className="text-[11px] text-[#7dba9a] font-mono">Copiar link personal →</span>
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#2c303a]">
              <button
                onClick={() => copiarEnlacePersonaje()}
                className="w-full btn-secondary text-xs"
              >
                Copiar enlace general (para que ellos elijan)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DE SOLICITUDES PENDIENTES */}
      {solicitudes.length > 0 && (
        <div className="max-w-7xl w-full mx-auto p-4 pb-0">
          <div className="p-3 border border-[#d4b978] bg-[#16140f] space-y-2">
            <h3 className="section-title text-[#d4b978] flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Solicitudes de intercambio pendientes ({solicitudes.length})
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {solicitudes.map(sol => (
                <div key={sol.id} className="flex items-center justify-between p-2 bg-[#0c0e13] border border-[#2c303a] text-xs">
                  <div>
                    <span className={`font-bold px-1.5 py-0.5 uppercase mr-2 ${sol.tipo === 'compra' ? 'bg-[#1a2a22] text-[#7dba9a]' : 'bg-[#2a1a1a] text-[#d98989]'}`}>
                      {sol.tipo}
                    </span>
                    <strong className="text-[#eceef2]">{sol.personaje?.nombre}</strong> {sol.tipo === 'compra' ? 'desea comprar' : 'desea vender'}{' '}
                    <strong className="text-[#eceef2]">{sol.item?.nombre}</strong> en <em>{sol.tienda?.nombre}</em> por{' '}
                    <span className="text-[#d4b978] font-bold">{formatearPrecio(sol.precio_cobre)}</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => inventoryApi.aprobarSolicitudTienda(sol).then(onRecargar)}
                      className="btn-success py-1 px-2 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button
                      onClick={() => inventoryApi.rechazarSolicitudTienda(sol.id).then(onRecargar)}
                      className="btn-danger py-1 px-2 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 1: MUNDO (CATÁLOGO + MESA + TIENDAS) */}
      {dmTab === 'mundo' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section className="lg:col-span-6 rpg-panel flex flex-col space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="section-title">Catálogo Global</h2>
                <p className="text-xs text-[#9aa1ae] mt-1">Arrastra a mesa o tienda, o envía a un jugador.</p>
              </div>
              
              <button
                onClick={() => setModalItemDM({
                  abierto: true, modo: 'crear',
                  item: { nombre: '', categoria: 'arma', peso: 1, oro: 10, plata: 0, cobre: 0, descripcion: '', icono: 'sword' }
                })}
                className="btn-primary text-xs shrink-0"
              >
                <Plus className="w-4 h-4" /> Nuevo
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar armas, pociones..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="rpg-input flex-1"
              />
              <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="rpg-input cursor-pointer">
                <option value="todos">Categorías</option>
                <option value="arma">Armas</option>
                <option value="pocion">Pociones</option>
                <option value="armadura">Armaduras</option>
                <option value="comun">Común</option>
                <option value="tesoro">Tesoros</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[460px] pr-1">
              <div className="slot-grid">
                {catalogoFiltrado.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ tipo: 'catalogo', itemId: item.id }));
                    }}
                    className="flex flex-col border border-[#2c303a] bg-[#0c0e13] cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex justify-between items-center px-2 pt-2">
                      <span className="text-[11px] font-mono text-[#9aa1ae] uppercase">{item.categoria}</span>
                      <span className="text-xs font-mono text-[#d4b978] font-bold">
                        {formatearPrecio(item.precio_cobre)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center px-2 py-2">
                      <div className="p-2 border border-[#2c303a] bg-[#07080b] text-[#c5d4e4] mb-1.5">
                        <ItemIcon name={item.icono} className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#eceef2] text-center line-clamp-2">{item.nombre}</p>
                      <p className="text-xs text-[#9aa1ae] font-mono">{item.peso} lbs</p>
                    </div>

                    <div className="flex border-t border-[#2c303a]">
                      <button
                        onClick={() => {
                          const des = cobreAMonedas(item.precio_cobre);
                          setModalItemDM({
                            abierto: true, modo: 'editar',
                            item: { id: item.id, nombre: item.nombre, categoria: item.categoria, peso: item.peso, oro: des.oro, plata: des.plata, cobre: des.cobre, descripcion: item.descripcion || '', icono: item.icono || 'sword' }
                          });
                        }}
                        className="flex-1 min-h-9 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#eceef2] hover:bg-[#161920]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemAEnviar(item)}
                        className="flex-1 min-h-9 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#7dba9a] hover:bg-[#161920] border-l border-[#2c303a]"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${item.nombre}"?`)) {
                            inventoryApi.eliminarItemCatalogo(item.id).then(onRecargar);
                          }
                        }}
                        className="flex-1 min-h-9 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989] hover:bg-[#161920] border-l border-[#2c303a]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => inventoryApi.soltarEnMesa('DM', { id: '', personaje_id: '', item_id: item.id, cantidad: 1, equipado: false, es_secreto: false, item }, 1, campanaActivaId).then(onRecargar)}
                      className="w-full btn-secondary min-h-9 text-xs border-0 border-t border-[#2c303a]"
                    >
                      Soltar en mesa <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Saco de Monedas DM */}
            <div className="pt-3 border-t border-[#2c303a] space-y-2">
              <h3 className="section-title flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#d4b978]" /> Saco de monedas
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <input type="number" placeholder="Oro" value={dmOro || ''} onChange={e => setDmOro(Number(e.target.value))} className="rpg-input text-center text-[#d4b978] font-bold" />
                <input type="number" placeholder="Plata" value={dmPlata || ''} onChange={e => setDmPlata(Number(e.target.value))} className="rpg-input text-center text-[#d5dae3]" />
                <input type="number" placeholder="Cobre" value={dmCobre || ''} onChange={e => setDmCobre(Number(e.target.value))} className="rpg-input text-center text-[#b08968]" />
                <button
                  onClick={() => {
                    const total = monedasACobre(dmOro, dmPlata, dmCobre);
                    inventoryApi.soltarBolsaMonedas(total, campanaActivaId).then(onRecargar); 
                    setDmOro(0); setDmPlata(0); setDmCobre(0);
                  }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" /> Soltar
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-6 flex flex-col space-y-4">
            <MesaComun
              itemsMesa={itemsMesa}
              esDM={true}
              onDropEnMesa={async (e) => {
                const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                if (data.tipo === 'catalogo') {
                  const it = catalogo.find(i => i.id === data.itemId);
                  if (it) {
                    await inventoryApi.soltarEnMesa('DM', { id: '', personaje_id: '', item_id: it.id, cantidad: 1, equipado: false, es_secreto: false, item: it }, 1, campanaActivaId);
                    onRecargar();
                  }
                }
              }}
              onTomarItem={() => {}}
              onTomarBolsa={() => {}}
              onRepartirBolsa={() => {}}
              onEliminarDeMesa={(id) => supabase.from('mesa_comun').delete().eq('id', id).then(onRecargar)}
            />

            <div className="rpg-panel space-y-3">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <h2 className="section-title">Tiendas de esta campaña</h2>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nueva tienda..."
                    value={nuevaTiendaNombre}
                    onChange={e => setNuevaTiendaNombre(e.target.value)}
                    className="rpg-input py-1 w-28 text-xs"
                  />
                  <button onClick={() => { inventoryApi.crearTienda(nuevaTiendaNombre).then(() => { setNuevaTiendaNombre(''); onRecargar(); }); }} className="btn-success py-1 px-2.5">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {tiendas.map(t => (
                  <StoreCard key={t.id} tienda={t} onActualizar={onRecargar} />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* PESTAÑA 2: MOCHILAS DEL GRUPO */}
      {dmTab === 'mochilas' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
          <div>
            <h2 className="section-title">Mochilas del grupo</h2>
            <p className="text-sm text-[#9aa1ae] mt-1">
              Cambia monedas, entrega objetos y activa el baúl de cada personaje.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personajes.map(p => {
              const pItems = inventariosGrupo.filter(inv => inv.personaje_id === p.id);
              const pPeso = pItems.filter(i => !i.en_baul).reduce((acc, i) => acc + ((i.item?.peso || 0) * i.cantidad), 0);
              const pMaxPeso = p.fuerza * 15;
              const pSobrecarga = pPeso > pMaxPeso;
              const pMonedas = cobreAMonedas(p.monedas_cobre);
              const isHovered = hoverPersonajeId === p.id;

              return (
                <div
                  key={p.id}
                  onDragOver={(e) => { e.preventDefault(); setHoverPersonajeId(p.id); }}
                  onDragLeave={() => setHoverPersonajeId(null)}
                  onDrop={(e) => handleDropItemAJugadorDM(e, p.id)}
                  className={`rpg-panel flex flex-col justify-between space-y-3 ${
                    isHovered ? 'border-[#9bb6cc] bg-[#14181f]' : ''
                  }`}
                >
                  <div className="border-b border-[#2c303a] pb-2.5 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-semibold text-sm text-[#eceef2]">{p.nombre}</h3>
                      <button
                        onClick={() => {
                          setPersonajes(prev => prev.map(pers => pers.id === p.id ? { ...pers, baul_habilitado: !pers.baul_habilitado } : pers));
                          inventoryApi.toggleBaulPersonaje(p.id, !!p.baul_habilitado).then(onRecargar);
                        }}
                        className={`flex items-center gap-1 text-xs font-bold px-2 min-h-8 border ${
                          p.baul_habilitado
                            ? 'bg-[#1a2430] text-[#c5d4e4] border-[#3a4a5c]'
                            : 'bg-[#0c0e13] text-[#9aa1ae] border-[#2c303a] hover:text-[#eceef2]'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        <span>{p.baul_habilitado ? 'Baúl Activo' : 'Baúl Desactivado'}</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#d4b978] shrink-0" />
                        <input
                          type="number"
                          min="0"
                          value={p.monedas_cobre}
                          onChange={(e) => {
                            const totalCobre = Math.max(0, parseInt(e.target.value) || 0);
                            inventoryApi.modificarMonedasPersonaje(p.id, totalCobre).then(onRecargar);
                          }}
                          className="w-20 px-1.5 py-1 bg-[#0c0e13] border border-[#2c303a] text-center text-xs font-mono font-bold text-[#d4b978]"
                        />
                        <span className="text-xs font-mono text-[#d4b978] font-bold whitespace-nowrap">
                          {pMonedas.oro} PO {pMonedas.plata > 0 ? `${pMonedas.plata} PP ` : ''}
                        </span>
                      </div>

                      <div className="text-xs text-[#9aa1ae] font-mono">
                        <span className={pSobrecarga ? "text-[#d98989] font-bold" : ""}>
                          {pPeso.toFixed(1)} / {pMaxPeso} lbs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[320px] pr-1">
                    {pItems.length === 0 ? (
                      <p className="text-center py-8 text-sm text-[#9aa1ae]">
                        Mochila vacía. Arrastra un ítem del catálogo aquí.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {pItems.map(inv => (
                          <div
                            key={inv.id}
                            className={`p-2 border flex flex-col justify-between min-h-28 ${
                              inv.es_secreto
                                ? 'bg-[#14101a] border-[#4a3d5c]'
                                : inv.en_baul
                                ? 'bg-[#10141a] border-[#3a4a5c]'
                                : 'bg-[#0c0e13] border-[#2c303a]'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex gap-1">
                                {inv.es_secreto && (
                                  <span className="text-[10px] font-bold px-1 bg-[#1a1622] text-[#c4b4e0] border border-[#4a3d5c]">
                                    SECRETO
                                  </span>
                                )}
                                {inv.en_baul && (
                                  <span className="text-[10px] font-bold px-1 bg-[#1a2430] text-[#c5d4e4] border border-[#3a4a5c]">
                                    BAÚL
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-mono font-bold px-1.5 bg-[#07080b] text-[#eceef2] border border-[#2c303a]">
                                x{inv.cantidad}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 my-1">
                              <div className={`p-1 border border-[#2c303a] shrink-0 ${inv.es_secreto ? 'text-[#c4b4e0]' : 'text-[#c5d4e4]'}`}>
                                <ItemIcon name={inv.item.icono} className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#eceef2] truncate">{inv.item.nombre}</p>
                                <p className="text-[11px] font-mono text-[#9aa1ae]">{(inv.item.peso * inv.cantidad).toFixed(1)} lbs</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-[#2c303a]">
                              <div className="flex items-center">
                                <button
                                  onClick={() => inventoryApi.actualizarCantidadInventario(inv.id, inv.cantidad - 1).then(onRecargar)}
                                  className="min-h-8 min-w-8 inline-flex items-center justify-center bg-[#161920] text-[#9aa1ae] hover:text-[#d98989] border border-[#2c303a]"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => inventoryApi.actualizarCantidadInventario(inv.id, inv.cantidad + 1).then(onRecargar)}
                                  className="min-h-8 min-w-8 inline-flex items-center justify-center bg-[#161920] text-[#9aa1ae] hover:text-[#7dba9a] border border-[#2c303a] border-l-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => inventoryApi.eliminarDeInventario(inv.id).then(onRecargar)}
                                className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL ENVIAR ÍTEM */}
      {itemAEnviar && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-[#2c303a] pb-2">
              <h3 className="font-semibold text-sm text-[#eceef2] flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#9bb6cc]" /> Enviar "{itemAEnviar.nombre}"
              </h3>
              <button onClick={() => setItemAEnviar(null)}><X className="w-4 h-4 text-[#9aa1ae]" /></button>
            </div>
            <div className="space-y-1.5">
              {personajes.map(p => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await inventoryApi.entregarItemAJugador(p.id, itemAEnviar.id, 1);
                    onRecargar();
                    setItemAEnviar(null);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-[#0c0e13] hover:bg-[#161920] border border-[#2c303a] min-h-12"
                >
                  <span className="text-sm font-semibold text-[#eceef2]">{p.nombre}</span>
                  <span className="text-xs text-[#9bb6cc] font-mono font-bold">+1</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR / CLONAR ÚNICO */}
      {modalItemDM?.abierto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rpg-panel max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c303a] pb-2">
              <h3 className="font-semibold text-sm text-[#c5d4e4] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9bb6cc]" />
                {modalItemDM.modo === 'crear' ? 'Crear objeto' : 'Editar / generar único'}
              </h3>
              <button onClick={() => setModalItemDM(null)}><X className="w-4 h-4 text-[#9aa1ae]" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Nombre</label>
                <input
                  type="text"
                  value={modalItemDM.item.nombre}
                  onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, nombre: e.target.value } })}
                  placeholder="Ej: Espada Larga Ígnea +1"
                  className="rpg-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Categoría</label>
                  <select
                    value={modalItemDM.item.categoria}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, categoria: e.target.value } })}
                    className="rpg-input w-full cursor-pointer"
                  >
                    <option value="arma">Arma</option>
                    <option value="armadura">Armadura</option>
                    <option value="pocion">Poción</option>
                    <option value="comun">Común / Equipo</option>
                    <option value="tesoro">Tesoro / Reliquia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Peso (libras)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={modalItemDM.item.peso}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, peso: parseFloat(e.target.value) || 0 } })}
                    className="rpg-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Icono</label>
                <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#0c0e13] border border-[#2c303a]">
                  {ICONOS_DISPONIBLES.map(iconKey => (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, icono: iconKey } })}
                      className={`p-2 min-h-10 flex items-center justify-center border ${
                        modalItemDM.item.icono === iconKey
                          ? 'bg-[#1a2430] border-[#9bb6cc] text-[#c5d4e4]'
                          : 'border-[#2c303a] text-[#9aa1ae] hover:text-[#eceef2]'
                      }`}
                    >
                      <ItemIcon name={iconKey} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Precio</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="PO"
                    value={modalItemDM.item.oro || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, oro: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[#d4b978] font-bold"
                  />
                  <input
                    type="number"
                    placeholder="PP"
                    value={modalItemDM.item.plata || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, plata: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[#d5dae3]"
                  />
                  <input
                    type="number"
                    placeholder="PC"
                    value={modalItemDM.item.cobre || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, cobre: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[#b08968]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa1ae] block mb-1">Propiedades / descripción</label>
                <textarea
                  rows={3}
                  value={modalItemDM.item.descripcion}
                  onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, descripcion: e.target.value } })}
                  placeholder="Ej: 1d8 cortante + 1d6 fuego. Versátil (1d10)."
                  className="rpg-input w-full resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#2c303a]">
              {modalItemDM.modo === 'editar' ? (
                <>
                  <button onClick={() => handleGuardarItemDM(true)} className="flex-1 btn-primary">
                    <Sparkles className="w-3.5 h-3.5" /> Generar único
                  </button>
                  <button onClick={() => handleGuardarItemDM(false)} className="flex-1 btn-secondary">
                    Sobrescribir
                  </button>
                </>
              ) : (
                <button onClick={() => handleGuardarItemDM(false)} className="w-full btn-primary">
                  Crear objeto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};