import React, { useState } from 'react';
import type { ItemInventario } from '../types';
import { ItemIcon, formatearPrecio } from '../services/inventoryApi';
import { getItemTypeClass } from '../../utils/itemTheme'; // Ajusta los '../' según tu estructura
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
  const tipoClase = getItemTypeClass(item);

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      className={`rpg-card ${tipoClase} flex flex-col cursor-grab active:cursor-grabbing select-none min-h-[175px] !p-0 overflow-hidden transition-all duration-200 ${
        equipado
          ? 'ring-1 ring-[var(--accent-gold)] shadow-[0_0_12px_rgba(209,177,129,0.25)]'
          : es_secreto
          ? 'bg-[#18131d]'
          : en_baul
          ? 'bg-[#14181f]'
          : ''
      }`}
    >
      {/* BARRA SUPERIOR (Visibilidad, badges y cantidad) */}
      <div className="flex justify-between items-center px-2 pt-2 z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSecreto(inv.id); }}
          className={`min-h-7 min-w-7 inline-flex items-center justify-center transition-colors cursor-pointer ${
            es_secreto ? 'text-[var(--type-wondrous)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
          aria-label={es_secreto ? 'Objeto secreto. Pulsar para hacerlo público' : 'Objeto público. Pulsar para ocultarlo'}
          title={es_secreto ? 'Secreto' : 'Público'}
        >
          {es_secreto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-1">
          {equipado && (
            <span className="text-[10px] font-bold tracking-wider text-[#111] bg-[var(--accent-gold)] px-1.5 py-0.2 rounded-xs shadow-xs">
              EQ
            </span>
          )}
          {en_baul && (
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-main)] bg-[#252e3d] px-1.5 py-0.2 border border-[#3b4c66] rounded-xs">
              BAÚL
            </span>
          )}
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-[var(--panel-dark)] border border-[var(--border-color)] text-[var(--accent-gold)] rounded-xs">
            x{cantidad}
          </span>
        </div>
      </div>

      {/* CUERPO CENTRAL (Icono, Título y Peso) */}
      <button
        type="button"
        onClick={() => setDetalle(v => !v)}
        className="flex-1 flex flex-col items-center justify-center px-2.5 py-1.5 text-center cursor-pointer"
        aria-expanded={detalle}
        aria-label={`${item.nombre}. ${detalle ? 'Ocultar' : 'Ver'} detalles`}
      >
        <div className={`p-2 mb-1.5 border rounded-xs transition-colors ${
          equipado
            ? 'bg-[var(--panel-dark)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
            : 'bg-[var(--panel-dark)] border-[var(--border-color)] text-[var(--text-main)]'
        }`}>
          <ItemIcon name={item.icono} className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-main)] leading-tight line-clamp-2 w-full">
          {item.nombre}
        </p>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-1">{pesoTotal} lbs</p>
      </button>

      {/* DETALLES DESPLEGABLES */}
      {detalle && (
        <div className="px-2.5 pb-2 text-left border-t border-[var(--border-color)] bg-[var(--panel-dark)] pt-2 mx-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent-gold-dim)] mb-1">
            {item.categoria} · {precioTxt}
          </p>
          <p className="text-xs text-[var(--text-main)] leading-snug opacity-90">
            {item.descripcion || 'Sin descripción.'}
          </p>
        </div>
      )}

      {/* BOTONERA INFERIOR */}
      <div className="flex items-stretch gap-px bg-[var(--border-color)] mt-auto border-t border-[var(--border-color)]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleEquipar(inv.id); }}
          className={`flex-1 min-h-8 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            equipado
              ? 'bg-[var(--accent-gold)] text-[#111] hover:bg-[#e2c598]'
              : 'bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#1f1f1a]'
          }`}
        >
          {equipado ? 'Equipado' : 'Equipar'}
        </button>

        {baulHabilitado && onMoverBaul && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoverBaul(inv.id, !!en_baul); }}
            className={`min-h-8 min-w-9 inline-flex items-center justify-center transition-colors cursor-pointer ${
              en_baul
                ? 'bg-[#252e3d] text-[var(--text-main)]'
                : 'bg-[var(--panel-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#1f1f1a]'
            }`}
            aria-label={en_baul ? 'Mover a la mochila' : 'Guardar en el baúl'}
            title={en_baul ? 'Mover a la mochila' : 'Guardar en el baúl'}
          >
            {en_baul ? <Package className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </article>
  );
};