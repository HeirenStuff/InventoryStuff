import React, { useState } from 'react';
import type { ItemInventario } from '../types';
import { ItemIcon, formatearPrecio } from '../services/inventoryApi';
import { Eye, EyeOff, Archive, Package } from 'lucide-react';

interface Props {
  inv: ItemInventario;
  onToggleEquipar: (id: string) => void;
  onToggleSecreto: (id: string) => void;
  baulHabilitado?: boolean;
  onMoverBaul?: (id: string, actualEnBaul: boolean) => void;
}

export const ItemTile: React.FC<Props> = ({
  inv,
  onToggleEquipar,
  onToggleSecreto,
  baulHabilitado = false,
  onMoverBaul,
}) => {
  const { item, cantidad, equipado, es_secreto, en_baul } = inv;
  const pesoTotal = (item.peso * cantidad).toFixed(1);
  const [detalle, setDetalle] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      tipo: 'mochila',
      inventarioId: inv.id,
      itemId: item.id,
      itemNombre: item.nombre,
    }));
  };

  const precioTxt = formatearPrecio(item.precio_cobre);

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      className={`flex flex-col border cursor-grab active:cursor-grabbing select-none min-h-[168px] ${
        es_secreto
          ? 'bg-[#14101a] border-[#4a3d5c]'
          : en_baul
          ? 'bg-[#10141a] border-[#3a4a5c]'
          : 'bg-[#0c0e13] border-[#2c303a] hover:border-[#4a5160]'
      } ${equipado ? 'border-[#9bb6cc] bg-[#12161c]' : ''}`}
    >
      <div className="flex justify-between items-center px-2 pt-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSecreto(inv.id); }}
          className={`min-h-8 min-w-8 inline-flex items-center justify-center ${
            es_secreto ? 'text-[#c4b4e0]' : 'text-[#5c6370] hover:text-[#eceef2]'
          }`}
          aria-label={es_secreto ? 'Objeto secreto. Pulsar para hacerlo público' : 'Objeto público. Pulsar para ocultarlo'}
          title={es_secreto ? 'Secreto' : 'Público'}
        >
          {es_secreto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-1">
          {equipado && (
            <span className="text-[11px] font-bold tracking-wide text-[#0b1016] bg-[#9bb6cc] px-1.5 py-0.5">
              EQ
            </span>
          )}
          {en_baul && (
            <span className="text-[11px] font-bold tracking-wide text-[#c5d4e4] bg-[#243040] px-1.5 py-0.5 border border-[#3a4a5c]">
              BAÚL
            </span>
          )}
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-[#07080b] border border-[#2c303a] text-[#eceef2]">
            x{cantidad}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDetalle(v => !v)}
        className="flex-1 flex flex-col items-center justify-center px-2 py-1 text-center"
        aria-expanded={detalle}
        aria-label={`${item.nombre}. ${detalle ? 'Ocultar' : 'Ver'} detalles`}
      >
        <div className={`p-2 mb-1.5 border ${
          equipado
            ? 'bg-[#161b22] border-[#9bb6cc] text-[#c5d4e4]'
            : es_secreto
            ? 'bg-[#1a1622] border-[#4a3d5c] text-[#c4b4e0]'
            : 'bg-[#07080b] border-[#2c303a] text-[#c5d4e4]'
        }`}>
          <ItemIcon name={item.icono} className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[#eceef2] leading-tight line-clamp-2 w-full">
          {item.nombre}
        </p>
        <p className="text-xs font-mono text-[#9aa1ae] mt-0.5">{pesoTotal} lbs</p>
      </button>

      {detalle && (
        <div className="px-2 pb-2 text-left border-t border-[#2c303a] pt-2 mx-0">
          <p className="text-[11px] uppercase tracking-wider text-[#9aa1ae] mb-1">{item.categoria} · {precioTxt}</p>
          <p className="text-xs text-[#d5dae3] leading-snug">
            {item.descripcion || 'Sin descripción.'}
          </p>
        </div>
      )}

      <div className="flex items-stretch gap-px bg-[#2c303a] mt-auto">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleEquipar(inv.id); }}
          className={`flex-1 min-h-10 text-xs font-semibold ${
            equipado
              ? 'bg-[#9bb6cc] text-[#0b1016]'
              : 'bg-[#161920] text-[#d5dae3] hover:bg-[#1e232c]'
          }`}
        >
          {equipado ? 'Equipado' : 'Equipar'}
        </button>

        {baulHabilitado && onMoverBaul && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoverBaul(inv.id, !!en_baul); }}
            className={`min-h-10 min-w-10 inline-flex items-center justify-center ${
              en_baul
                ? 'bg-[#243040] text-[#c5d4e4]'
                : 'bg-[#161920] text-[#9aa1ae] hover:text-[#eceef2]'
            }`}
            aria-label={en_baul ? 'Mover a la mochila' : 'Guardar en el baúl'}
            title={en_baul ? 'Mover a la mochila' : 'Guardar en el baúl'}
          >
            {en_baul ? <Package className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
        )}
      </div>
    </article>
  );
};
