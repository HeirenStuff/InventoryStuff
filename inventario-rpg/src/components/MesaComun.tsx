import React, { useState, useRef } from 'react';
import type { ItemMesaComun, Personaje } from '../types';
import { ItemIcon, cobreAMonedas } from '../services/inventoryApi';
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
      className={`relative flex flex-col h-full rpg-panel ${
        isDraggingOver ? 'border-[#9bb6cc] bg-[#14181f]' : ''
      }`}
    >
      {isDraggingOver && (
        <div className="absolute inset-0 border-2 border-dashed border-[#9bb6cc] bg-[#07080b]/80 z-30 pointer-events-none flex items-center justify-center">
          <span className="text-[#c5d4e4] font-semibold text-sm uppercase tracking-wider px-3 py-2 border border-[#9bb6cc] bg-[#101218]">
            Suelta para dejar en la mesa
          </span>
        </div>
      )}

      <div className="flex justify-between items-end gap-3 mb-3 pb-3 border-b border-[#2c303a]">
        <div>
          <h2 className="section-title">Mesa común</h2>
          <p className="text-xs text-[#9aa1ae] mt-1">
            {esDM ? 'Arrastra del catálogo o pulsa soltar.' : 'Toma objetos o arrástralos a tu mochila.'}
          </p>
        </div>
        <span className="text-sm font-mono text-[#eceef2] border border-[#2c303a] px-2 py-1">
          {itemsMesa.length}
        </span>
      </div>

      {itemsMesa.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#2c303a] px-4">
          <p className="text-[#d5dae3] text-sm mb-1">La mesa está vacía.</p>
          <p className="text-[#9aa1ae] text-xs">
            {esDM ? 'Suelta botín desde el catálogo.' : 'Arrastra objetos de tu mochila para compartirlos.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[480px] pr-1">
          {bolsas.length > 0 && (
            <div className="space-y-2">
              {bolsas.map((m) => {
                const monedas = cobreAMonedas(m.monedas_cobre_contenido || 0);
                return (
                  <div key={m.id} className="p-3 border border-[#4a4030] bg-[#16140f] space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Coins className="w-5 h-5 text-[#d4b978] shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm text-[#eceef2]">Bolsa de monedas</h4>
                          <p className="text-sm font-mono text-[#d4b978] font-bold">
                            {monedas.oro} PO {monedas.plata > 0 ? `${monedas.plata} PP ` : ''}{monedas.cobre > 0 ? `${monedas.cobre} PC` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!esDM && (
                          <button type="button" onClick={() => onTomarBolsa(m)} className="btn-primary py-1.5 px-2.5 text-xs">
                            Tomar todo
                          </button>
                        )}
                        {esDM && onEliminarDeMesa && (
                          <button type="button" onClick={() => onEliminarDeMesa(m.id)} className="btn-danger min-h-9 min-w-9 p-0" aria-label="Quitar bolsa de la mesa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!esDM && (
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#4a4030]">
                        <button type="button" onClick={() => onRepartirBolsa(m)} className="btn-secondary py-1.5 text-xs">
                          <Users className="w-3.5 h-3.5" />
                          Dividir
                        </button>
                        <button
                          type="button"
                          onClick={() => { setBolsaRetirar(m); setOroRetirar(monedas.oro); }}
                          className="btn-secondary py-1.5 text-xs"
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

          {items.length > 0 && (
            <div className="slot-grid">
              {items.map((m) => (
                <div
                  key={m.id}
                  draggable={!esDM}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                      tipo: 'mesa',
                      mesaItemId: m.id,
                    }));
                  }}
                  className="flex flex-col border border-[#2c303a] bg-[#0c0e13] min-h-[148px]"
                >
                  <div className="flex justify-between items-center px-2 pt-2 text-xs text-[#9aa1ae]">
                    <span className="truncate">De: {m.creado_por}</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 bg-[#07080b] border border-[#2c303a] text-[#eceef2]">
                      x{m.cantidad}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center px-2 py-2">
                    <div className="p-2 mb-1.5 border border-[#2c303a] bg-[#07080b] text-[#c5d4e4]">
                      <ItemIcon name={m.item?.icono || 'package'} className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#eceef2] text-center line-clamp-2">{m.item?.nombre}</p>
                    <p className="text-xs font-mono text-[#9aa1ae]">{m.item?.peso} lbs</p>
                  </div>

                  {!esDM ? (
                    <button
                      type="button"
                      onClick={() => onTomarItem(m)}
                      className="btn-success w-full min-h-10 text-xs"
                    >
                      <ArrowDownToLine className="w-4 h-4" /> Tomar
                    </button>
                  ) : onEliminarDeMesa ? (
                    <button
                      type="button"
                      onClick={() => onEliminarDeMesa(m.id)}
                      className="btn-danger w-full min-h-10 text-xs"
                    >
                      <Trash2 className="w-4 h-4" /> Quitar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bolsaRetirar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="rpg-panel max-w-xs w-full space-y-3" role="dialog" aria-labelledby="retirar-oro-titulo">
            <h4 id="retirar-oro-titulo" className="section-title">Retirar oro</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={Math.floor((bolsaRetirar.monedas_cobre_contenido || 0) / 100)}
                value={oroRetirar}
                onChange={(e) => setOroRetirar(Number(e.target.value))}
                className="rpg-input text-center text-[#d4b978] font-mono font-bold text-base w-full"
                aria-label="Piezas de oro a retirar"
              />
              <span className="text-sm font-bold text-[#d4b978]">PO</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
