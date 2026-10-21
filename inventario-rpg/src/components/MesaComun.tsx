import React, { useState, useRef } from 'react';
import type { ItemMesaComun, Personaje } from '../types';
import { ItemIcon, cobreAMonedas } from '../services/inventoryApi';
import { getItemTypeClass } from '../../utils/itemTheme'; // Ajusta los '../' según tu estructura de carpetas
import { Coins, ArrowDownToLine, Users, Sliders, Trash2 } from 'lucide-react';

interface Props {
  itemsMesa: ItemMesaComun[];
  personajeActual?: Personaje | null;
  esDM?: boolean;
  onDropEnMesa: (e: React.DragEvent) => void;
  onTomarItem: (mItem: ItemMesaComun) => void;
  onTomarBolsa: (bolsa: ItemMesaComun, cantidadCobre?: number) => void;
  onRepartirBolsa: (bolsa: ItemMesaComun) => void;
  onEliminarDeMesa?: (id: string) => void;
}

export const MesaComun: React.FC<Props> = ({
  itemsMesa,
  esDM = false,
  onDropEnMesa,
  onTomarItem,
  onTomarBolsa,
  onRepartirBolsa,
  onEliminarDeMesa,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [bolsaRetirar, setBolsaRetirar] = useState<ItemMesaComun | null>(null);
  const [oroRetirar, setOroRetirar] = useState(0);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    onDropEnMesa(e);
  };

  const bolsas = itemsMesa.filter(i => i.es_bolsa_monedas);
  const items = itemsMesa.filter(i => !i.es_bolsa_monedas);

  return (
    <section
      aria-label="Mesa común"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-full rpg-panel transition-all duration-200 ${
        isDraggingOver ? 'border-[var(--accent-gold)] shadow-[0_0_20px_rgba(209,177,129,0.2)]' : ''
      }`}
    >
      {/* OVERLAY VISUAL DE ARRASTRE */}
      {isDraggingOver && (
        <div className="absolute inset-0 border-2 border-dashed border-[var(--accent-gold)] bg-[var(--bg-stone)]/90 z-30 pointer-events-none flex items-center justify-center">
          <span className="text-[var(--accent-gold)] font-bold text-sm uppercase tracking-widest px-4 py-2 border border-[var(--accent-gold)] bg-[var(--panel-dark)] shadow-[0_0_15px_rgba(209,177,129,0.3)]">
            Soltar en la mesa común
          </span>
        </div>
      )}

      {/* HEADER DE LA SECCIÓN */}
      <div className="flex justify-between items-end gap-3 mb-3 pb-3 border-b border-[var(--border-color)]">
        <div>
          <h2 className="section-title !mb-0 !border-b-0">Mesa común</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {esDM ? 'Arrastra del catálogo o pulsa soltar.' : 'Toma objetos o arrástralos a tu mochila.'}
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[var(--accent-gold)] border border-[var(--border-color)] bg-[var(--panel-dark)] px-2.5 py-1 rounded-xs">
          {itemsMesa.length}
        </span>
      </div>

      {itemsMesa.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border-color)] px-4">
          <p className="text-[var(--text-main)] text-sm mb-1">La mesa está vacía.</p>
          <p className="text-[var(--text-muted)] text-xs">
            {esDM ? 'Suelta botín desde el catálogo.' : 'Arrastra objetos de tu mochila para compartirlos.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[480px] pr-1">
          {/* BOLSAS DE MONEDAS */}
          {bolsas.length > 0 && (
            <div className="space-y-2">
              {bolsas.map((m) => {
                const monedas = cobreAMonedas(m.monedas_cobre_contenido || 0);
                return (
                  <div key={m.id} className="p-3 border border-[var(--border-gold)] bg-[var(--panel-dark)] space-y-2 rounded-xs shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 border border-[var(--border-gold)] bg-[var(--bg-stone)] rounded-xs shrink-0">
                          <Coins className="w-5 h-5 text-[var(--accent-gold)]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-[var(--text-main)]">Bolsa de monedas</h4>
                          <p className="text-xs font-mono text-[var(--accent-gold)] font-bold mt-0.5">
                            {monedas.oro} PO {monedas.plata > 0 ? `${monedas.plata} PP ` : ''}{monedas.cobre > 0 ? `${monedas.cobre} PC` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!esDM && (
                          <button type="button" onClick={() => onTomarBolsa(m)} className="btn-primary py-1 px-2.5 text-xs">
                            Tomar todo
                          </button>
                        )}
                        {esDM && onEliminarDeMesa && (
                          <button type="button" onClick={() => onEliminarDeMesa(m.id)} className="btn-danger min-h-8 min-w-8 p-0" aria-label="Quitar bolsa de la mesa">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!esDM && (
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[var(--border-color)]">
                        <button type="button" onClick={() => onRepartirBolsa(m)} className="btn-secondary py-1 text-xs">
                          <Users className="w-3.5 h-3.5" />
                          Dividir
                        </button>
                        <button
                          type="button"
                          onClick={() => { setBolsaRetirar(m); setOroRetirar(monedas.oro); }}
                          className="btn-secondary py-1 text-xs"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Cantidad
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ÍTEMS DE LA MESA */}
          {items.length > 0 && (
            <div className="slot-grid">
              {items.map((m) => {
                const tipoClase = getItemTypeClass(m.item);
                return (
                  <div
                    key={m.id}
                    draggable={!esDM}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        tipo: 'mesa',
                        mesaItemId: m.id,
                      }));
                    }}
                    className={`rpg-card ${tipoClase} flex flex-col min-h-[160px] !p-0 overflow-hidden cursor-grab active:cursor-grabbing select-none`}
                  >
                    <div className="flex justify-between items-center px-2 pt-2 text-xs text-[var(--text-muted)]">
                      <span className="truncate text-[10px] uppercase tracking-wider font-mono">De: {m.creado_por}</span>
                      <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 bg-[var(--panel-dark)] border border-[var(--border-color)] text-[var(--accent-gold)] rounded-xs">
                        x{m.cantidad}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 text-center">
                      <div className="p-2 mb-1.5 border border-[var(--border-color)] bg-[var(--panel-dark)] text-[var(--text-main)] rounded-xs">
                        <ItemIcon name={m.item?.icono || 'package'} className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-main)] line-clamp-2 leading-tight">{m.item?.nombre}</p>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">{m.item?.peso} lbs</p>
                    </div>

                    {!esDM ? (
                      <button
                        type="button"
                        onClick={() => onTomarItem(m)}
                        className="btn-primary w-full min-h-8 text-xs !border-x-0 !border-b-0 cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" /> Tomar
                      </button>
                    ) : onEliminarDeMesa ? (
                      <button
                        type="button"
                        onClick={() => onEliminarDeMesa(m.id)}
                        className="btn-danger w-full min-h-8 text-xs !border-x-0 !border-b-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL RETIRAR ORO */}
      {bolsaRetirar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="rpg-panel max-w-xs w-full space-y-3 border-2 border-[var(--accent-gold)] shadow-[0_0_30px_rgba(0,0,0,0.8)]" role="dialog" aria-labelledby="retirar-oro-titulo">
            <h4 id="retirar-oro-titulo" className="section-title">Retirar oro</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={Math.floor((bolsaRetirar.monedas_cobre_contenido || 0) / 100)}
                value={oroRetirar}
                onChange={(e) => setOroRetirar(Number(e.target.value))}
                className="rpg-input text-center text-[var(--accent-gold)] font-mono font-bold text-base w-full"
                aria-label="Piezas de oro a retirar"
                autoFocus
              />
              <span className="text-sm font-bold text-[var(--accent-gold)] font-mono">PO</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => setBolsaRetirar(null)} className="btn-secondary">Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  onTomarBolsa(bolsaRetirar, oroRetirar * 100);
                  setBolsaRetirar(null);
                }}
                className="btn-primary"
              >
                Retirar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};