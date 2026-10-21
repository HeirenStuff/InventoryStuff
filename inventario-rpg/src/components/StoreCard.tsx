import React, { useState } from 'react';
import type { Tienda, TiendaItem } from '../types';
import { ItemIcon, formatearPrecio, inventoryApi } from '../services/inventoryApi';
import { Store, ChevronDown, ChevronUp, Trash2, Plus, Minus, ArrowUpRight, Edit2, Check, X, Percent } from 'lucide-react';

interface Props {
  tienda: Tienda;
  onActualizar: () => void;
}

export const StoreCard: React.FC<Props> = ({ tienda, onActualizar }) => {
  const [expandido, setExpandido] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(tienda.nombre);
  const [multInput, setMultInput] = useState<number>(tienda.multiplicador_precio ?? 1.0);

  const multTienda = tienda.multiplicador_precio ?? 1.0;

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

  const handleCambiarMultiplicador = async (nuevoMult: number) => {
    setMultInput(nuevoMult);
    await inventoryApi.actualizarMultiplicadorTienda(tienda.id, nuevoMult);
    onActualizar();
  };

  const items = tienda.items || [];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
      onDragLeave={() => setIsHovered(false)}
      onDrop={handleDropEnTienda}
      className={`border ${
        isHovered
          ? 'border-[#9bb6cc] bg-[#14181f]'
          : 'bg-[#101218] border-[#2c303a]'
      }`}
    >
      <div className="p-3 flex justify-between items-center gap-2 border-b border-[#2c303a] bg-[#0c0e13]">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`p-2 border shrink-0 ${tienda.abierta ? 'bg-[#1a2a22] border-[#3d6a56] text-[#7dba9a]' : 'bg-[#161920] border-[#2c303a] text-[#6d7380]'}`}>
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
                className="btn-success p-1 min-h-8 min-w-8 flex items-center justify-center"
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
              <h3 className="font-semibold text-sm text-[#eceef2] truncate">
                {tienda.nombre}
                <span className="text-xs font-mono text-[#9aa1ae] font-normal ml-1.5">({items.length})</span>
              </h3>
              <p className="text-xs text-[#9aa1ae]">
                {isHovered ? 'Suelta para añadir stock' : tienda.abierta ? 'Abierta para el grupo' : 'Oculta'}
              </p>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* CONTROL MULTIPLICADOR */}
          <div className="flex items-center gap-1 bg-[#07080b] border border-[#2c303a] px-1.5 py-0.5 rounded text-xs" title="Modificador de precio (Ej: 0.5 = Mitad de precio)">
            <Percent className="w-3 h-3 text-[#d4b978]" />
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={multInput}
              onChange={(e) => setMultInput(parseFloat(e.target.value) || 0)}
              onBlur={(e) => handleCambiarMultiplicador(parseFloat(e.target.value) || 1.0)}
              className="w-11 bg-transparent text-center font-mono font-bold text-[#d4b978] outline-none"
            />
          </div>

          {!editando && (
            <>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#eceef2]"
                title="Editar nombre"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleEliminarTienda}
                className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]"
                title="Eliminar tienda"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => { inventoryApi.toggleTiendaAbierta(tienda.id, tienda.abierta).then(onActualizar); }}
            className={tienda.abierta ? 'btn-danger py-1 px-2 text-xs' : 'btn-success py-1 px-2 text-xs'}
          >
            {tienda.abierta ? 'Cerrar' : 'Abrir'}
          </button>

          <button 
            type="button" 
            onClick={() => setExpandido(!expandido)} 
            className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#eceef2]"
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="p-2 space-y-1">
          {items.length === 0 ? (
            <p className="text-center py-6 text-sm text-[#9aa1ae] border border-dashed border-[#2c303a]">
              Sin productos. Arrastra ítems del catálogo.
            </p>
          ) : (
            items.map((tItem) => {
              const agotado = tItem.stock !== null && tItem.stock <= 0;
              const precioBase = tItem.precio_cobre_override ?? tItem.item.precio_cobre;
              const precioCalculado = Math.round(precioBase * multTienda);

              return (
                <div key={tItem.id} className={`flex items-center justify-between gap-2 p-2 border text-sm ${agotado ? 'opacity-50 border-[#2c303a] bg-[#0c0e13]' : 'border-[#2c303a] bg-[#0c0e13]'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <ItemIcon name={tItem.item.icono} className="w-5 h-5 text-[#c5d4e4] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#eceef2] truncate">{tItem.item.nombre}</p>
                      <p className="text-xs text-[#d4b978] font-mono">
                        {formatearPrecio(precioCalculado)}
                        {multTienda !== 1.0 && (
                          <span className="text-[10px] text-[#9aa1ae] ml-1">({multTienda}x)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {tItem.stock !== null ? (
                      <div className="flex items-center border border-[#2c303a] text-xs font-mono">
                        <button type="button" onClick={() => inventoryApi.modificarStockTienda(tItem.id, -1, tItem.stock).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold w-6 text-center">{tItem.stock}</span>
                        <button type="button" onClick={() => inventoryApi.modificarStockTienda(tItem.id, 1, tItem.stock).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#7dba9a]">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#9aa1ae] font-mono px-2">∞</span>
                    )}

                    <button type="button" onClick={() => handleMandarAMesa(tItem)} title="Tirar 1 a la mesa" className="min-h-8 min-w-8 inline-flex items-center justify-center border border-[#2c303a] text-[#c5d4e4] hover:bg-[#161920]">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => inventoryApi.eliminarDeTienda(tItem.id).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]">
                      <Trash2 className="w-4 h-4" />
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