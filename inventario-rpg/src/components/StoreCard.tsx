import React, { useState, useEffect } from 'react';
import type { Tienda, TiendaItem } from '../types';
import { ItemIcon, formatearPrecio, inventoryApi } from '../services/inventoryApi';
import { getItemTypeClass } from '../../utils/itemTheme';
import { Store, ChevronDown, ChevronUp, Trash2, Plus, Minus, ArrowUpRight, Edit2, Check, X } from 'lucide-react';

interface Props {
  tienda: Tienda;
  onActualizar: () => void;
}

export const StoreCard: React.FC<Props> = ({ tienda, onActualizar }) => {
  const [expandido, setExpandido] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(tienda.nombre);

  const multReal = typeof tienda.multiplicador_precio === 'number' && tienda.multiplicador_precio > 0 
    ? tienda.multiplicador_precio 
    : 1.0;

  const [porcentajeInput, setPorcentajeInput] = useState<number>(Math.round((multReal - 1) * 100));

  useEffect(() => {
    setPorcentajeInput(Math.round((multReal - 1) * 100));
  }, [multReal]);

  const handleDropEnTienda = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (data.tipo === 'catalogo') {
        await inventoryApi.stockearTienda(tienda.id, data.itemId);
        onActualizar();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMandarAMesa = async (tItem: TiendaItem) => {
    await inventoryApi.soltarEnMesa(tienda.nombre, {
      id: '',
      personaje_id: '',
      item_id: tItem.item.id,
      cantidad: 1,
      equipado: false,
      es_secreto: false,
      item: tItem.item,
    });
    if (tItem.stock !== null && tItem.stock > 0) {
      await inventoryApi.modificarStockTienda(tItem.id, -1, tItem.stock);
    }
    onActualizar();
  };

  const handleGuardarNombre = async () => {
    if (!nuevoNombre.trim()) return;
    await inventoryApi.actualizarTienda(tienda.id, nuevoNombre);
    setEditando(false);
    onActualizar();
  };

  const handleEliminarTienda = async () => {
    if (confirm(`¿Estás seguro de que quieres eliminar la tienda "${tienda.nombre}" y todo su stock?`)) {
      await inventoryApi.eliminarTienda(tienda.id);
      onActualizar();
    }
  };

  const handleGuardarPorcentaje = async (pct: number) => {
    const nuevoMult = Math.max(0.05, Number((1 + pct / 100).toFixed(2)));
    await inventoryApi.actualizarMultiplicadorTienda(tienda.id, nuevoMult);
    onActualizar();
  };

  const items = tienda.items || [];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
      onDragLeave={() => setIsHovered(false)}
      onDrop={handleDropEnTienda}
      className={`border rounded-sm transition-all duration-200 ${
        isHovered
          ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-[0_0_15px_rgba(209,177,129,0.2)]'
          : 'bg-[var(--panel)] border-[var(--border-color)]'
      }`}
    >
      {/* HEADER DE LA TIENDA */}
      <div className="p-3 flex justify-between items-center gap-2 border-b border-[var(--border-color)] bg-[var(--panel-dark)]">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`p-2 border shrink-0 rounded-xs ${
            tienda.abierta 
              ? 'bg-[#1e2419] border-[#5d733c] text-[#a4c66f]' 
              : 'bg-[var(--panel)] border-[var(--border-color)] text-[var(--text-muted)]'
          }`}>
            <Store className="w-4 h-4" />
          </div>

          {editando ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuardarNombre();
                  if (e.key === 'Escape') setEditando(false);
                }}
                className="rpg-input text-xs py-1 px-2 flex-1"
                autoFocus
              />
              <button 
                type="button" 
                onClick={handleGuardarNombre} 
                className="btn-primary p-1 min-h-8 min-w-8 flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button" 
                onClick={() => { setNuevoNombre(tienda.nombre); setEditando(false); }} 
                className="btn-secondary p-1 min-h-8 min-w-8 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="text-left flex-1 min-w-0 cursor-pointer"
              aria-expanded={expandido}
            >
              <h3 className="font-semibold text-sm text-[var(--text-main)] truncate tracking-wide">
                {tienda.nombre}
                <span className="text-xs font-mono text-[var(--accent-gold-dim)] font-normal ml-1.5">({items.length})</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isHovered ? 'Suelta para añadir stock' : tienda.abierta ? 'Abierta para el grupo' : 'Oculta'}
              </p>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* CONTROL DE AJUSTE % */}
          <div 
            className="flex items-center bg-[var(--bg-stone)] border border-[var(--border-color)] px-1.5 py-0.5 text-xs rounded-xs" 
            title="Ajuste de precio: 0% es precio base, -50% es mitad de precio, 20% es recargo"
          >
            <input
              type="number"
              step="5"
              min="-95"
              max="500"
              value={porcentajeInput}
              onChange={(e) => setPorcentajeInput(parseInt(e.target.value) || 0)}
              onBlur={() => handleGuardarPorcentaje(porcentajeInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={`w-11 bg-transparent text-right font-mono font-bold outline-none ${
                porcentajeInput < 0 ? 'text-[#8ea35b]' : porcentajeInput > 0 ? 'text-[#c25953]' : 'text-[var(--accent-gold)]'
              }`}
            />
            <span className="text-[11px] text-[var(--text-muted)] font-mono ml-0.5">%</span>
          </div>

          {!editando && (
            <>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="min-h-8 min-w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                title="Editar nombre"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleEliminarTienda}
                className="min-h-8 min-w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#c25953] transition-colors"
                title="Eliminar tienda"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => { inventoryApi.toggleTiendaAbierta(tienda.id, tienda.abierta).then(onActualizar); }}
            className={tienda.abierta ? 'btn-danger py-1 px-2.5 text-xs' : 'btn-primary py-1 px-2.5 text-xs'}
          >
            {tienda.abierta ? 'Cerrar' : 'Abrir'}
          </button>

          <button 
            type="button" 
            onClick={() => setExpandido(!expandido)} 
            className="min-h-8 min-w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* LISTADO DE ITEMS CON FORMATO GRIMORIO */}
      {expandido && (
        <div className="p-2 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-center py-6 text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-color)]">
              Sin productos. Arrastra ítems del catálogo.
            </p>
          ) : (
            items.map((tItem) => {
              const agotado = tItem.stock !== null && tItem.stock <= 0;
              const precioBase = tItem.precio_cobre_override ?? tItem.item.precio_cobre;
              const precioCalculado = Math.round(precioBase * multReal);

              return (
                <div 
                  key={tItem.id} 
                  className={`rpg-card ${getItemTypeClass(tItem.item)} flex items-center justify-between gap-2 p-2 text-sm ${
                    agotado ? 'opacity-40 grayscale-[0.5]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-xs bg-[var(--panel-dark)] border border-[var(--border-color)] shrink-0">
                      <ItemIcon name={tItem.item.icono} className="w-4 h-4 text-[var(--accent-gold)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-main)] truncate leading-tight">
                        {tItem.item.nombre}
                      </p>
                      <p className="text-xs text-[var(--accent-gold)] font-mono flex items-center gap-1 mt-0.5">
                        {formatearPrecio(precioCalculado)}
                        {porcentajeInput !== 0 && (
                          <span className={`text-[10px] font-bold ${porcentajeInput < 0 ? 'text-[#8ea35b]' : 'text-[#c25953]'}`}>
                            ({porcentajeInput > 0 ? `+${porcentajeInput}` : porcentajeInput}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Control de Stock */}
                    {tItem.stock !== null ? (
                      <div className="flex items-center bg-[var(--panel-dark)] border border-[var(--border-color)] text-xs font-mono rounded-xs">
                        <button 
                          type="button" 
                          onClick={() => inventoryApi.modificarStockTienda(tItem.id, -1, tItem.stock).then(onActualizar)} 
                          className="min-h-7 min-w-7 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#c25953] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold w-6 text-center text-[var(--text-main)]">{tItem.stock}</span>
                        <button 
                          type="button" 
                          onClick={() => inventoryApi.modificarStockTienda(tItem.id, 1, tItem.stock).then(onActualizar)} 
                          className="min-h-7 min-w-7 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#8ea35b] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--accent-gold-dim)] font-mono px-2">∞</span>
                    )}

                    <button 
                      type="button" 
                      onClick={() => handleMandarAMesa(tItem)} 
                      title="Tirar 1 a la mesa" 
                      className="min-h-7 min-w-7 inline-flex items-center justify-center border border-[var(--border-color)] bg-[var(--panel-dark)] text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors rounded-xs cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => inventoryApi.eliminarDeTienda(tItem.id).then(onActualizar)} 
                      className="min-h-7 min-w-7 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[#c25953] transition-colors cursor-pointer"
                      title="Quitar de tienda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};