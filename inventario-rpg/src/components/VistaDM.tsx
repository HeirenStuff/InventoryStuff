import React, { useState } from 'react';
import type { Personaje, ItemInventario, ItemCatalogo, ItemMesaComun, Tienda, SolicitudTienda } from '../types';
import { 
  inventoryApi, cobreAMonedas, monedasACobre, formatearPrecio, ItemIcon, supabase 
} from '../services/inventoryApi';
import { getItemTypeClass } from '../../utils/itemTheme'; // Ajusta la ruta si es necesario
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-stone)] text-[var(--text-main)]">
      {/* HEADER DM */}
      <header className="px-4 lg:px-6 py-3 bg-[var(--panel-dark)] border-b-2 border-[var(--accent-gold)] flex flex-wrap justify-between items-center gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-bold text-sm text-[var(--accent-gold)] uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-[var(--accent-gold)]" /> Panel DM
          </h1>

          <select
            value={campanaActivaId}
            onChange={(e) => onCambiarCampana(e.target.value)}
            className="rpg-input text-xs py-1 px-2 border-[var(--border-color)]"
          >
            {campanas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <div className="flex items-center border border-[var(--border-color)] rounded-xs overflow-hidden" role="tablist">
            <button
              onClick={() => setDmTab('mundo')}
              className={`flex items-center gap-1.5 px-3 min-h-8 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                dmTab === 'mundo' ? 'bg-[var(--accent-gold)] text-[#111]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--panel)]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Mesa y tiendas
            </button>
            <button
              onClick={() => { setDmTab('mochilas'); onRecargar(); }}
              className={`flex items-center gap-1.5 px-3 min-h-8 text-xs font-bold uppercase tracking-wider border-l border-[var(--border-color)] cursor-pointer transition-colors ${
                dmTab === 'mochilas' ? 'bg-[var(--accent-gold)] text-[#111]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--panel)]'
              }`}
            >
              <Backpack className="w-3.5 h-3.5" /> Mochilas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setModalLinksJugadores(true)} 
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Copiar links para los jugadores"
          >
            <Copy className="w-3.5 h-3.5 text-[#8ea35b]" /> Copiar Link Jugadores
          </button>
          
          <button onClick={onSalir} className="btn-secondary">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      {/* PANEL DE SOLICITUDES PENDIENTES */}
      {solicitudes.length > 0 && (
        <div className="max-w-7xl w-full mx-auto p-4 pb-0">
          <div className="p-3 border border-[var(--border-gold)] bg-[var(--panel-dark)] space-y-2 rounded-xs">
            <h3 className="section-title text-[var(--accent-gold)] flex items-center gap-1.5 !mb-0 !border-b-0">
              <Clock className="w-4 h-4" /> Solicitudes de intercambio pendientes ({solicitudes.length})
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {solicitudes.map(sol => (
                <div key={sol.id} className="flex items-center justify-between p-2 bg-[var(--panel)] border border-[var(--border-color)] text-xs rounded-xs">
                  <div>
                    <span className={`font-bold px-1.5 py-0.5 text-[10px] uppercase rounded-xs mr-2 ${
                      sol.tipo === 'compra' 
                        ? 'bg-[#1e2419] text-[#a4c66f] border border-[#5d733c]' 
                        : 'bg-[#2a1a1a] text-[#d98989] border border-[#6a3d41]'
                    }`}>
                      {sol.tipo}
                    </span>
                    <strong className="text-[var(--text-main)]">{sol.personaje?.nombre}</strong> {sol.tipo === 'compra' ? 'desea comprar' : 'desea vender'}{' '}
                    <strong className="text-[var(--accent-gold)]">{sol.item?.nombre}</strong> en <em>{sol.tienda?.nombre}</em> por{' '}
                    <span className="text-[var(--accent-gold)] font-mono font-bold">{formatearPrecio(sol.precio_cobre)}</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => inventoryApi.aprobarSolicitudTienda(sol).then(onRecargar)}
                      className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button
                      onClick={() => inventoryApi.rechazarSolicitudTienda(sol.id).then(onRecargar)}
                      className="btn-danger py-1 px-2.5 text-xs flex items-center gap-1"
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
          {/* COLUMNA IZQUIERDA: CATÁLOGO */}
          <section className="lg:col-span-6 rpg-panel flex flex-col space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="section-title">Catálogo Global</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Arrastra a mesa o tienda, o envía a un jugador.</p>
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
                {catalogoFiltrado.map(item => {
                  const tipoClase = getItemTypeClass(item);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ tipo: 'catalogo', itemId: item.id }));
                      }}
                      className={`rpg-card ${tipoClase} flex flex-col cursor-grab active:cursor-grabbing select-none !p-0 overflow-hidden min-h-[170px]`}
                    >
                      <div className="flex justify-between items-center px-2 pt-2">
                        <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">{item.categoria}</span>
                        <span className="text-xs font-mono text-[var(--accent-gold)] font-bold">
                          {formatearPrecio(item.precio_cobre)}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center px-2 py-2 flex-1">
                        <div className="p-2 border border-[var(--border-color)] bg-[var(--panel-dark)] text-[var(--accent-gold)] mb-1.5 rounded-xs">
                          <ItemIcon name={item.icono} className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-main)] text-center line-clamp-2 leading-tight">{item.nombre}</p>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">{item.peso} lbs</p>
                      </div>

                      <div className="flex border-t border-[var(--border-color)] bg-[var(--panel-dark)]">
                        <button
                          onClick={() => {
                            const des = cobreAMonedas(item.precio_cobre);
                            setModalItemDM({
                              abierto: true, modo: 'editar',
                              item: { id: item.id, nombre: item.nombre, categoria: item.categoria, peso: item.peso, oro: des.oro, plata: des.plata, cobre: des.cobre, descripcion: item.descripcion || '', icono: item.icono || 'sword' }
                            });
                          }}
                          className="flex-1 min-h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[#1a1a15] transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemAEnviar(item)}
                          className="flex-1 min-h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#8ea35b] hover:bg-[#1a1a15] border-l border-[var(--border-color)] transition-colors"
                          title="Enviar a jugador"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${item.nombre}"?`)) {
                              inventoryApi.eliminarItemCatalogo(item.id).then(onRecargar);
                            }
                          }}
                          className="flex-1 min-h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#c25953] hover:bg-[#1a1a15] border-l border-[var(--border-color)] transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => inventoryApi.soltarEnMesa('DM', { id: '', personaje_id: '', item_id: item.id, cantidad: 1, equipado: false, es_secreto: false, item }, 1, campanaActivaId).then(onRecargar)}
                        className="w-full btn-secondary min-h-8 text-[11px] font-bold uppercase tracking-wider !border-x-0 !border-b-0 cursor-pointer"
                      >
                        Soltar en mesa <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Saco de Monedas DM */}
            <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
              <h3 className="section-title flex items-center gap-1.5 !mb-1">
                <Coins className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> Saco de monedas
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <input type="number" placeholder="Oro" value={dmOro || ''} onChange={e => setDmOro(Number(e.target.value))} className="rpg-input text-center text-[var(--coin-gp)] font-bold" />
                <input type="number" placeholder="Plata" value={dmPlata || ''} onChange={e => setDmPlata(Number(e.target.value))} className="rpg-input text-center text-[var(--coin-sp)]" />
                <input type="number" placeholder="Cobre" value={dmCobre || ''} onChange={e => setDmCobre(Number(e.target.value))} className="rpg-input text-center text-[var(--coin-cp)]" />
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

          {/* COLUMNA DERECHA: MESA + TIENDAS */}
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
                <h2 className="section-title !mb-0">Tiendas de esta campaña</h2>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nueva tienda..."
                    value={nuevaTiendaNombre}
                    onChange={e => setNuevaTiendaNombre(e.target.value)}
                    className="rpg-input py-1 w-32 text-xs"
                  />
                  <button 
                    onClick={() => { 
                      if (!nuevaTiendaNombre.trim()) return;
                      inventoryApi.crearTienda(nuevaTiendaNombre, campanaActivaId).then(() => { 
                        setNuevaTiendaNombre(''); 
                        onRecargar(); 
                      }); 
                    }} 
                    className="btn-primary py-1 px-2.5"
                  >
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
            <p className="text-sm text-[var(--text-muted)] mt-1">
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
                  className={`rpg-panel flex flex-col justify-between space-y-3 transition-colors ${
                    isHovered ? 'border-[var(--accent-gold)] shadow-[0_0_15px_rgba(209,177,129,0.2)]' : ''
                  }`}
                >
                  <div className="border-b border-[var(--border-color)] pb-2.5 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--text-main)]">{p.nombre}</h3>
                      <button
                        onClick={() => {
                          setPersonajes(prev => prev.map(pers => pers.id === p.id ? { ...pers, baul_habilitado: !pers.baul_habilitado } : pers));
                          inventoryApi.toggleBaulPersonaje(p.id, !!p.baul_habilitado).then(onRecargar);
                        }}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2 min-h-7 border rounded-xs cursor-pointer ${
                          p.baul_habilitado
                            ? 'bg-[#1a2430] text-[var(--text-main)] border-[#3b4c66]'
                            : 'bg-[var(--panel-dark)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        <span>{p.baul_habilitado ? 'Baúl Activo' : 'Baúl Desactivado'}</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                        <input
                          type="number"
                          min="0"
                          value={p.monedas_cobre}
                          onChange={(e) => {
                            const totalCobre = Math.max(0, parseInt(e.target.value) || 0);
                            inventoryApi.modificarMonedasPersonaje(p.id, totalCobre).then(onRecargar);
                          }}
                          className="w-20 px-1.5 py-1 bg-[var(--panel-dark)] border border-[var(--border-color)] text-center text-xs font-mono font-bold text-[var(--accent-gold)] rounded-xs"
                        />
                        <span className="text-xs font-mono text-[var(--accent-gold)] font-bold whitespace-nowrap">
                          {pMonedas.oro} PO {pMonedas.plata > 0 ? `${pMonedas.plata} PP ` : ''}
                        </span>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] font-mono">
                        <span className={pSobrecarga ? "text-[#c25953] font-bold" : ""}>
                          {pPeso.toFixed(1)} / {pMaxPeso} lbs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[320px] pr-1">
                    {pItems.length === 0 ? (
                      <p className="text-center py-8 text-xs text-[var(--text-muted)]">
                        Mochila vacía. Arrastra un ítem del catálogo aquí.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {pItems.map(inv => {
                          const tipoClase = getItemTypeClass(inv.item);
                          return (
                            <div
                              key={inv.id}
                              className={`rpg-card ${tipoClase} p-2 flex flex-col justify-between min-h-28 ${
                                inv.es_secreto
                                  ? 'bg-[#18131d]'
                                  : inv.en_baul
                                  ? 'bg-[#14181f]'
                                  : ''
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex gap-1">
                                  {inv.es_secreto && (
                                    <span className="text-[9px] font-bold px-1 bg-[#18131d] text-[var(--type-wondrous)] border border-[#4a3d5c] rounded-xs">
                                      SECRETO
                                    </span>
                                  )}
                                  {inv.en_baul && (
                                    <span className="text-[9px] font-bold px-1 bg-[#1a2430] text-[var(--text-main)] border border-[#3a4a5c] rounded-xs">
                                      BAÚL
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono font-bold px-1.5 bg-[var(--panel-dark)] text-[var(--accent-gold)] border border-[var(--border-color)] rounded-xs">
                                  x{inv.cantidad}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 my-1">
                                <div className="p-1 border border-[var(--border-color)] bg-[var(--panel-dark)] rounded-xs shrink-0 text-[var(--text-main)]">
                                  <ItemIcon name={inv.item.icono} className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-main)] truncate leading-tight">{inv.item.nombre}</p>
                                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">{(inv.item.peso * inv.cantidad).toFixed(1)} lbs</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                                <div className="flex items-center rounded-xs overflow-hidden border border-[var(--border-color)]">
                                  <button
                                    onClick={() => inventoryApi.actualizarCantidadInventario(inv.id, inv.cantidad - 1).then(onRecargar)}
                                    className="min-h-7 min-w-7 inline-flex items-center justify-center bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[#c25953] cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => inventoryApi.actualizarCantidadInventario(inv.id, inv.cantidad + 1).then(onRecargar)}
                                    className="min-h-7 min-w-7 inline-flex items-center justify-center bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[#8ea35b] border-l border-[var(--border-color)] cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  onClick={() => inventoryApi.eliminarDeInventario(inv.id).then(onRecargar)}
                                  className="min-h-7 min-w-7 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#c25953] transition-colors cursor-pointer"
                                  title="Eliminar ítem"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-3 border-2 border-[var(--accent-gold)]">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
              <h3 className="font-semibold text-sm text-[var(--accent-gold)] flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[var(--accent-gold)]" /> Enviar "{itemAEnviar.nombre}"
              </h3>
              <button onClick={() => setItemAEnviar(null)} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
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
                  className="w-full flex items-center justify-between p-3 bg-[var(--panel-dark)] hover:bg-[#1f1f1a] border border-[var(--border-color)] hover:border-[var(--accent-gold)] min-h-12 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-semibold text-[var(--text-main)]">{p.nombre}</span>
                  <span className="text-xs text-[var(--accent-gold)] font-mono font-bold">+1</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA COPIAR ENLACES CON ALIAS */}
      {modalLinksJugadores && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rpg-panel max-w-sm w-full space-y-3 border-2 border-[var(--accent-gold)]">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
              <h3 className="font-semibold text-sm text-[var(--accent-gold)] flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#8ea35b]" /> Enlaces para Jugadores
              </h3>
              <button onClick={() => setModalLinksJugadores(false)} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Toca un personaje para copiar su enlace directo personal:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {personajes.length === 0 ? (
                <p className="text-xs text-center py-4 text-[var(--text-muted)]">No hay personajes creados todavía.</p>
              ) : (
                personajes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => copiarEnlacePersonaje(p.nombre)}
                    className="w-full flex items-center justify-between p-2.5 bg-[var(--panel-dark)] hover:bg-[#1f1f1a] border border-[var(--border-color)] text-left hover:border-[var(--accent-gold)] text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span className="font-semibold text-[var(--text-main)]">{p.nombre}</span>
                    </div>
                    <span className="text-[11px] text-[#8ea35b] font-mono">Copiar link personal →</span>
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-color)]">
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

      {/* MODAL CREAR / EDITAR / CLONAR ÚNICO */}
      {modalItemDM?.abierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rpg-panel max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 border-2 border-[var(--accent-gold)]">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
              <h3 className="font-semibold text-sm text-[var(--accent-gold)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                {modalItemDM.modo === 'crear' ? 'Crear objeto' : 'Editar / generar único'}
              </h3>
              <button onClick={() => setModalItemDM(null)} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Nombre</label>
                <input
                  type="text"
                  value={modalItemDM.item.nombre}
                  onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, nombre: e.target.value } })}
                  placeholder="Ej: Espada Larga Ígnea +1"
                  className="rpg-input w-full"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Categoría</label>
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
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Peso (libras)</label>
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
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Icono</label>
                <div className="grid grid-cols-9 gap-1.5 p-2 bg-[var(--panel-dark)] border border-[var(--border-color)] rounded-xs">
                  {ICONOS_DISPONIBLES.map(iconKey => (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, icono: iconKey } })}
                      className={`p-2 min-h-10 flex items-center justify-center border rounded-xs transition-colors cursor-pointer ${
                        modalItemDM.item.icono === iconKey
                          ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-[#111]'
                          : 'border-[var(--border-color)] bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <ItemIcon name={iconKey} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Precio</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="PO"
                    value={modalItemDM.item.oro || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, oro: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[var(--coin-gp)] font-bold"
                  />
                  <input
                    type="number"
                    placeholder="PP"
                    value={modalItemDM.item.plata || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, plata: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[var(--coin-sp)]"
                  />
                  <input
                    type="number"
                    placeholder="PC"
                    value={modalItemDM.item.cobre || ''}
                    onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, cobre: parseInt(e.target.value) || 0 } })}
                    className="rpg-input w-full text-center text-[var(--coin-cp)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Propiedades / descripción</label>
                <textarea
                  rows={3}
                  value={modalItemDM.item.descripcion}
                  onChange={e => setModalItemDM({ ...modalItemDM, item: { ...modalItemDM.item, descripcion: e.target.value } })}
                  placeholder="Ej: 1d8 cortante + 1d6 fuego. Versátil (1d10)."
                  className="rpg-input w-full resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[var(--border-color)]">
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