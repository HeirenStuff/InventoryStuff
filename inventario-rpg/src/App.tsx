import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, inventoryApi, cobreAMonedas, monedasACobre } from './services/inventoryApi';
import type { Personaje, ItemInventario, ItemCatalogo, ItemMesaComun, Tienda, SolicitudTienda } from './types';
import { VistaDM } from './components/VistaDM';
import { VistaJugador } from './components/VistaJugador';
import { Crown, Plus, Loader2, X } from 'lucide-react';

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [personaje, setPersonaje] = useState<Personaje | null>(null);
  const [esDM, setEsDM] = useState(false);

  // Campañas
  const [campanas, setCampanas] = useState<{ id: string; nombre: string }[]>([]);
  const [campanaActivaId, setCampanaActivaId] = useState<string>('a0000000-0000-0000-0000-000000000001');

  // Parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const campanaParam = urlParams.get('campana');
  const forzarJugador = urlParams.get('rol') === 'jugador';
  const personajeParam = urlParams.get('personaje');


  useEffect(() => {
    if (campanaParam) {
      setCampanaActivaId(campanaParam);
    }
  }, [campanaParam]);

  // Modal crear aventurero
  const [modalNuevoPj, setModalNuevoPj] = useState(false);
  const [nuevoPjNombre, setNuevoPjNombre] = useState('');
  const [nuevoPjFue, setNuevoPjFue] = useState(10);
  const [nuevoPjOro, setNuevoPjOro] = useState(15);

  // Datos globales sincronizados
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [itemsMesa, setItemsMesa] = useState<ItemMesaComun[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudTienda[]>([]);
  const [inventariosGrupo, setInventariosGrupo] = useState<ItemInventario[]>([]);

  const personajeRef = useRef<Personaje | null>(personaje);
  personajeRef.current = personaje;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const recargarTodo = useCallback(async () => {
    try {
      // 1. Cargar lista de campañas
      const { data: cData } = await supabase.from('campanas').select('*').order('nombre');
      if (cData && cData.length > 0) {
        setCampanas(cData);
      }

      // 2. Cargar datos principales
      const data = await inventoryApi.cargarDatosIniciales();
      setCatalogo(data.catalogo);

      // 👉 AUTOLOGIN: Si la URL trae un personaje, buscarlo e iniciar sesión directo
      let pjActual = personajeRef.current;
      if (personajeParam && !pjActual) {
        const nombreBuscado = decodeURIComponent(personajeParam).trim().toLowerCase();
        const pjEncontrado = data.personajes.find(
          p => p.id === personajeParam || p.nombre.trim().toLowerCase() === nombreBuscado
        );

        if (pjEncontrado) {
          pjActual = pjEncontrado;
          setPersonaje(pjEncontrado);
          // Si el personaje pertenece a la campaña 01, sincronizar la campaña activa
          if ((pjEncontrado as any).campana_id) {
            setCampanaActivaId((pjEncontrado as any).campana_id);
          }
        }
      }

      const campanaFinal = (pjActual as any)?.campana_id || campanaActivaId;

      // 3. Filtrar por la campaña activa
      setPersonajes(data.personajes.filter(p => (p as any).campana_id === campanaFinal));
      setTiendas(data.tiendas.filter(t => (t as any).campana_id === campanaFinal));
      setItemsMesa(data.mesa.filter(m => (m as any).campana_id === campanaFinal));

      // 4. Solicitudes e inventarios grupales
      const sols = await inventoryApi.cargarSolicitudes();
      setSolicitudes(sols.filter(s => (s.personaje as any)?.campana_id === campanaFinal));

      const grupo = await inventoryApi.cargarInventariosGrupo();
      setInventariosGrupo(grupo);

      // 5. Cargar la mochila del personaje activo
      if (pjActual?.id) {
        const miInv = await inventoryApi.cargarInventarioPersonaje(pjActual.id);
        setInventario(miInv);
        const { data: pActualDB } = await supabase.from('personajes').select('*').eq('id', pjActual.id).single();
        if (pActualDB) setPersonaje(pActualDB);
      }
    } catch (err) {
      console.error('Error al sincronizar partida:', err);
    }
  }, [campanaActivaId, personajeParam]);

  const recargarConDebounce = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      recargarTodo();
    }, 120);
  }, [recargarTodo]);

  useEffect(() => {
    recargarTodo().finally(() => setCargando(false));

    const canalGlobal = supabase.channel('partida-en-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campanas' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa_comun' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventarios' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_tienda' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personajes' }, (payload) => {
        if (payload.new && personajeRef.current && (payload.new as any).id === personajeRef.current.id) {
          setPersonaje(payload.new as Personaje);
        }
        recargarConDebounce();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiendas' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_items' }, recargarConDebounce)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogo_items' }, recargarConDebounce)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime conectado');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error Realtime:', err);
        }
      });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') recargarTodo();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalSeguridad = setInterval(() => {
      recargarConDebounce();
    }, 8000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      clearInterval(intervalSeguridad);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(canalGlobal);
    };
  }, [recargarTodo, recargarConDebounce]);

  useEffect(() => {
    if (personaje?.id) {
      inventoryApi.cargarInventarioPersonaje(personaje.id).then(setInventario);
    }
  }, [personaje?.id]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#07080b] flex flex-col items-center justify-center gap-3 text-[#9aa1ae]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9bb6cc]" />
        <p className="text-sm font-mono uppercase tracking-wider">Cargando partida...</p>
      </div>
    );
  }

  // 1. SELECTOR DE ROL / BIENVENIDA / CREAR PERSONAJE
  if (!personaje && !esDM) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#07080b]">
        <div className="rpg-panel max-w-md w-full space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-[#eceef2]">Inventario D&D</h1>
            
            {!forzarJugador && campanas.length > 0 && (
              <div className="mt-3">
                <label className="text-xs uppercase text-[#9aa1ae] block mb-1">Campaña activa</label>
                <select
                  value={campanaActivaId}
                  onChange={(e) => setCampanaActivaId(e.target.value)}
                  className="rpg-input w-full cursor-pointer"
                >
                  {campanas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            
            <p className="text-sm text-[#9aa1ae] mt-2">Selecciona tu personaje para unirte:</p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto" role="list">
            {personajes.length === 0 ? (
              <p className="text-xs text-[#9aa1ae] text-center py-4 border border-dashed border-[#2c303a]">
                No hay aventureros creados en esta campaña.
              </p>
            ) : (
              personajes.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersonaje(p)}
                  className="w-full rpg-card flex items-center justify-between p-3 cursor-pointer text-left min-h-14"
                >
                  <div>
                    <h3 className="font-semibold text-sm text-[#eceef2]">{p.nombre}</h3>
                    <p className="text-xs text-[#9aa1ae] font-mono">FUE {p.fuerza} · {p.fuerza * 15} lbs</p>
                  </div>
                  <span className="text-sm text-[#d4b978] font-mono font-bold">
                    {cobreAMonedas(p.monedas_cobre).oro} PO
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setModalNuevoPj(true)}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Crear Nuevo Aventurero
          </button>

          {!forzarJugador && (
            <button onClick={() => setEsDM(true)} className="w-full btn-primary">
              <Crown className="w-4 h-4 text-[#0b1016]" /> Entrar como Dungeon Master
            </button>
          )}
        </div>

        {/* MODAL CREAR PERSONAJE */}
        {modalNuevoPj && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="rpg-panel max-w-sm w-full space-y-3">
              <div className="flex justify-between items-center border-b border-[#2c303a] pb-2">
                <h3 className="font-semibold text-sm text-[#eceef2]">Nuevo Aventurero</h3>
                <button onClick={() => setModalNuevoPj(false)}><X className="w-4 h-4 text-[#9aa1ae]" /></button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-[#9aa1ae] block">Nombre del aventurero</label>
                  <input
                    type="text"
                    value={nuevoPjNombre}
                    onChange={e => setNuevoPjNombre(e.target.value)}
                    placeholder="Ej: Thorin Escudo de Roble"
                    className="rpg-input w-full text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#9aa1ae] block">Fuerza (FUE)</label>
                    <input
                      type="number"
                      value={nuevoPjFue}
                      onChange={e => setNuevoPjFue(Number(e.target.value))}
                      className="rpg-input w-full text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9aa1ae] block">Oro Inicial (PO)</label>
                    <input
                      type="number"
                      value={nuevoPjOro}
                      onChange={e => setNuevoPjOro(Number(e.target.value))}
                      className="rpg-input w-full text-sm text-center text-[#d4b978]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button onClick={() => setModalNuevoPj(false)} className="flex-1 btn-secondary text-xs">Cancelar</button>
                <button
                  onClick={async () => {
                    if (!nuevoPjNombre.trim()) return alert('Ponle un nombre');
                    await inventoryApi.crearPersonaje({
                      nombre: nuevoPjNombre,
                      fuerza: nuevoPjFue,
                      monedas_cobre: monedasACobre(nuevoPjOro, 0, 0),
                      campana_id: campanaActivaId
                    });
                    setNuevoPjNombre('');
                    setModalNuevoPj(false);
                    recargarConDebounce();
                  }}
                  className="flex-1 btn-primary text-xs"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. MODO MASTER
  if (esDM) {
    return (
      <VistaDM
        campanas={campanas}
        campanaActivaId={campanaActivaId}
        onCambiarCampana={(id) => setCampanaActivaId(id)}
        catalogo={catalogo}
        personajes={personajes}
        setPersonajes={setPersonajes}
        inventariosGrupo={inventariosGrupo}
        itemsMesa={itemsMesa}
        tiendas={tiendas}
        solicitudes={solicitudes}
        onRecargar={recargarConDebounce}
        onSalir={() => setEsDM(false)}
      />
    );
  }

  // 3. MODO JUGADOR
  return (
    <VistaJugador
      personaje={personaje!}
      personajes={personajes}
      inventario={inventario}
      setInventario={setInventario}
      itemsMesa={itemsMesa}
      setItemsMesa={setItemsMesa}
      tiendas={tiendas}
      solicitudes={solicitudes}
      inventariosGrupo={inventariosGrupo}
      onRecargar={recargarConDebounce}
      onSalir={() => setPersonaje(null)}
    />
  );
}