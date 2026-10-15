import React, { useState } from 'react';
import type { Tienda, TiendaItem } from '../types';
import { ItemIcon, formatearPrecio, inventoryApi } from '../services/inventoryApi';
import { Store, ChevronDown, ChevronUp, Trash2, Plus, Minus, ArrowUpRight } from 'lucide-react';

interface Props {
  tienda: Tienda;
  onActualizar: () => void;
}

export const StoreCard: React.FC<Props> = ({ tienda, onActualizar }) => {
  const [expandido, setExpandido] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

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
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
          aria-expanded={expandido}
        >
          <div className={`p-2 border ${tienda.abierta ? 'bg-[#1a2a22] border-[#3d6a56] text-[#7dba9a]' : 'bg-[#161920] border-[#2c303a] text-[#6d7380]'}`}>
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-[#eceef2] truncate">
              {tienda.nombre}
              <span className="text-xs font-mono text-[#9aa1ae] font-normal ml-1.5">({items.length})</span>
            </h3>
            <p className="text-xs text-[#9aa1ae]">
              {isHovered ? 'Suelta para añadir stock' : tienda.abierta ? 'Abierta para el grupo' : 'Oculta'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { inventoryApi.toggleTiendaAbierta(tienda.id, tienda.abierta).then(onActualizar); }}
            className={tienda.abierta ? 'btn-danger py-1.5 text-xs' : 'btn-success py-1.5 text-xs'}
          >
            {tienda.abierta ? 'Cerrar' : 'Abrir'}
          </button>
          <button type="button" onClick={() => setExpandido(!expandido)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#eceef2]" aria-label={expandido ? 'Contraer tienda' : 'Expandir tienda'}>
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

              return (
                <div key={tItem.id} className={`flex items-center justify-between gap-2 p-2 border text-sm ${agotado ? 'opacity-50 border-[#2c303a] bg-[#0c0e13]' : 'border-[#2c303a] bg-[#0c0e13]'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <ItemIcon name={tItem.item.icono} className="w-5 h-5 text-[#c5d4e4] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#eceef2] truncate">{tItem.item.nombre}</p>
                      <p className="text-xs text-[#d4b978] font-mono">
                        {formatearPrecio(tItem.precio_cobre_override ?? tItem.item.precio_cobre)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {tItem.stock !== null ? (
                      <div className="flex items-center border border-[#2c303a] text-xs font-mono">
                        <button type="button" onClick={() => inventoryApi.modificarStockTienda(tItem.id, -1, tItem.stock).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]" aria-label="Bajar stock">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold w-6 text-center">{tItem.stock}</span>
                        <button type="button" onClick={() => inventoryApi.modificarStockTienda(tItem.id, 1, tItem.stock).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#7dba9a]" aria-label="Subir stock">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#9aa1ae] font-mono px-2">∞</span>
                    )}

                    <button type="button" onClick={() => handleMandarAMesa(tItem)} title="Tirar 1 a la mesa" aria-label="Enviar uno a la mesa" className="min-h-8 min-w-8 inline-flex items-center justify-center border border-[#2c303a] text-[#c5d4e4] hover:bg-[#161920]">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => inventoryApi.eliminarDeTienda(tItem.id).then(onActualizar)} className="min-h-8 min-w-8 inline-flex items-center justify-center text-[#9aa1ae] hover:text-[#d98989]" aria-label="Quitar de la tienda">
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
