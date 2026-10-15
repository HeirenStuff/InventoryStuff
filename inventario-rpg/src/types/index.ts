export interface ItemCatalogo {
    id: string;
    nombre: string;
    categoria: string;
    peso: number;
    precio_cobre: number;
    descripcion: string;
    icono: string;
  }

  export interface SolicitudTienda {
    id: string;
    personaje_id: string;
    tienda_id: string;
    tienda_item_id?: string;
    item_id: string;
    inventario_id?: string;
    tipo: 'compra' | 'venta';
    cantidad: number;
    precio_cobre: number;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    created_at?: string;
    personaje?: Personaje;
    tienda?: Tienda;
    item?: ItemCatalogo;
  }
    
  export interface ItemInventario {
    id: string;
    personaje_id: string;
    item_id: string;
    cantidad: number;
    equipado: boolean;
    es_secreto: boolean;
    en_baul?: boolean; // Nuevo: si está guardado en el baúl personal
    notas?: string;
    item: ItemCatalogo;
  }
  
  export interface Personaje {
    id: string;
    nombre: string;
    fuerza: number;
    monedas_cobre: number;
    baul_habilitado?: boolean; // Nuevo: permiso del DM
  }
  
  export interface ItemMesaComun {
    id: string;
    item_id?: string | null;
    cantidad: number;
    creado_por: string;
    es_bolsa_monedas?: boolean;
    monedas_cobre_contenido?: number;
    item?: ItemCatalogo;
  }
  
  export interface TiendaItem {
    id: string;
    tienda_id: string;
    item_id: string;
    stock: number | null;
    precio_cobre_override?: number;
    item: ItemCatalogo;
  }
  
  export interface Tienda {
    id: string;
    nombre: string;
    tipo?: string;
    abierta: boolean;
    multiplicador_precio: number;
    items?: TiendaItem[];
  }
  
  export interface DesgloseMonedas {
    oro: number;
    plata: number;
    cobre: number;
  }