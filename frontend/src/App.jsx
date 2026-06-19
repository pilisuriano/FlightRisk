import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import Select from 'react-select'
import 'leaflet/dist/leaflet.css'
import './App.css'
import L from 'leaflet'
import GaugeRiesgo from './GaugeRiesgo.jsx'

// Evitamos el parche de íconos CDN: usamos divIcon completamente personalizados.
delete L.Icon.Default.prototype._getIconUrl;

// ─── Helpers de mapa ─────────────────────────────────────────────────────────

function crearIcono(tipo) {
  const clases = { origen: 'marker-origen', destino: 'marker-destino', escala: 'marker-escala' };
  const etiquetas = { origen: '✈', destino: '🛬', escala: '⏱' };
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin ${clases[tipo]}"><span>${etiquetas[tipo]}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

// Genera puntos intermedios para curvar la polilínea (curva cuadrática simple).
function puntosArco(a, b, pasos = 20) {
  if (!a || !b) return [];
  const lat1 = a.lat, lon1 = a.lon, lat2 = b.lat, lon2 = b.lon;
  const mcx = (lat1 + lat2) / 2;
  const mcy = (lon1 + lon2) / 2;
  const dist = Math.hypot(lat2 - lat1, lon2 - lon1);
  // Punto de control desplazado perpendicularmente para la curva
  const cx = mcx - (lon2 - lon1) * 0.15;
  const cy = mcy + (lat2 - lat1) * 0.15 + dist * 0.1;
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const t = i / pasos;
    const lat = (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * cx + t ** 2 * lat2;
    const lon = (1 - t) ** 2 * lon1 + 2 * (1 - t) * t * cy + t ** 2 * lon2;
    return [lat, lon];
  });
}

// Componente hijo para auto-encuadre animado cuando cambia la ruta activa.
function AjustarVista({ rutaActiva }) {
  const map = useMap();
  useEffect(() => {
    if (!rutaActiva) return;
    const puntos = [rutaActiva.origenInfo, rutaActiva.escalaInfo, rutaActiva.destinoInfo]
      .filter(Boolean)
      .map(p => [p.lat, p.lon]);
    if (puntos.length >= 2) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [60, 60], animate: true, duration: 0.8 });
    }
  }, [rutaActiva, map]);
  return null;
}

// ─── Estilos reutilizables ────────────────────────────────────────────────────

const S = {
  sidebar: {
    width: 400, minWidth: 360, backgroundColor: '#fff',
    boxShadow: '2px 0 16px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column',
    overflowY: 'auto', zIndex: 1000, position: 'relative',
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
    padding: '20px 24px 18px', color: 'white', flexShrink: 0,
  },
  headerTitle: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.3px', color: 'white' },
  headerTag: { margin: '3px 0 0', fontSize: 12, opacity: .8, fontWeight: 400 },
  form: { padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 14, outline: 'none', color: '#1a202c', background: '#fff', transition: 'border-color .2s' },
  btnPrimary: { padding: '11px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background .2s, opacity .2s', letterSpacing: '.01em' },
  btnDanger: { padding: '10px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', transition: 'background .2s' },
  btnMuted: { padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#4a5568', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  card: { border: '1.5px solid #e2e8f0', borderRadius: 10, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: 18, margin: '0 16px 14px', animation: 'fadeIn .25s ease both' },
  cardGreen: { border: '2px solid #16a34a', borderRadius: 10, backgroundColor: '#f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: 18, margin: '0 16px 14px', animation: 'fadeIn .25s ease both' },
};

// Estilo para react-select acorde al tema
const selectStyles = {
  control: (b, s) => ({ ...b, borderColor: s.isFocused ? '#2563eb' : '#e2e8f0', borderWidth: 1.5, borderRadius: 6, minHeight: 38, boxShadow: s.isFocused ? '0 0 0 3px rgba(37,99,235,.12)' : 'none', '&:hover': { borderColor: '#2563eb' } }),
  option: (b, s) => ({ ...b, fontSize: 13, backgroundColor: s.isSelected ? '#2563eb' : s.isFocused ? '#eff6ff' : 'white', color: s.isSelected ? 'white' : '#1a202c' }),
  placeholder: (b) => ({ ...b, color: '#a0aec0', fontSize: 13 }),
  singleValue: (b) => ({ ...b, fontSize: 13 }),
  menu: (b) => ({ ...b, zIndex: 9999, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }),
  menuPortal: (b) => ({ ...b, zIndex: 9999 }),
};

// ─── Vuelos demo ─────────────────────────────────────────────────────────────

const INFO_VUELOS_SIMULADOS = {
  'AC850': { escala: 0,   aerolinea: 'Air Canada',      origen: 'ORD', destino: 'SFO', demora: 140, escala_aeropuerto: null },
  'IB620': { escala: 90,  aerolinea: 'Iberia',          origen: 'NRT', destino: 'ITM', demora: 150, escala_aeropuerto: 'PKX' },
  'UA110': { escala: 120, aerolinea: 'United Airlines', origen: 'IST', destino: 'CDG', demora: 145, escala_aeropuerto: 'FRA' },
  'EK730': { escala: 0,   aerolinea: 'Emirates',        origen: 'HRE', destino: 'JNB', demora: 160, escala_aeropuerto: null },
  'MF820': { escala: 60,  aerolinea: 'Xiamen Air',      origen: 'NKG', destino: 'PKX', demora: 140, escala_aeropuerto: 'PVG' },
};

// ─── Componente principal ─────────────────────────────────────────────────────

function App() {
  const [aeropuertos, setAeropuertos] = useState({});
  const [opcionesAerolineas, setOpcionesAerolineas] = useState([]);

  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [aerolinea, setAerolinea] = useState(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [numeroVuelo, setNumeroVuelo] = useState('');
  const [vuelosSugeridos, setVuelosSugeridos] = useState([]);
  const [formData, setFormData] = useState({ weather: 0.9 });

  const [rutaActiva, setRutaActiva] = useState(null);
  const [vueloOriginal, setVueloOriginal] = useState(null);   // vuelo actual (puede ser intercambiado)
  const [vueloPrevio, setVueloPrevio] = useState(null);       // snapshot antes del intercambio
  const [alternativas, setAlternativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const opcionesAeropuertos = useMemo(
    () => Object.values(aeropuertos).map(a => ({ value: a.id, label: a.name })),
    [aeropuertos]
  );

  // Carga inicial: aeropuertos y aerolíneas desde el backend.
  useEffect(() => {
    fetch('/api/aeropuertos')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const mapa = {};
        data.forEach(a => {
          const ciudad = a.city && a.city !== 'nan' ? a.city : a.iata;
          const pais = a.country && a.country !== 'nan' ? `, ${a.country}` : '';
          mapa[a.iata] = { id: a.iata, lat: a.lat, lon: a.lon, name: `${ciudad}${pais} (${a.iata})` };
        });
        setAeropuertos(mapa);
      })
      .catch(console.error);

    fetch('/api/aerolineas')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setOpcionesAerolineas(data.map(a => ({ value: a, label: a })));
      })
      .catch(console.error);
  }, []);

  // Atajo demo: autocompletar al tipear un Nº de vuelo conocido.
  useEffect(() => {
    const limpio = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const info = INFO_VUELOS_SIMULADOS[limpio];
    if (info) {
      const op = opcionesAeropuertos.find(a => a.value === info.origen);
      const dp = opcionesAeropuertos.find(a => a.value === info.destino);
      if (op) setOrigen(op);
      if (dp) setDestino(dp);
      setAerolinea({ value: info.aerolinea, label: info.aerolinea });
    }
  }, [numeroVuelo, opcionesAeropuertos]);

  // Panel "Vuelos disponibles" cuando se eligen origen+destino sin Nº de vuelo.
  useEffect(() => {
    if (origen && destino && !numeroVuelo) {
      const disponibles = Object.entries(INFO_VUELOS_SIMULADOS)
        .filter(([, i]) => i.origen === origen.value && i.destino === destino.value)
        .map(([num, i]) => ({ numero: num, ...i }));
      setVuelosSugeridos(disponibles);
    } else {
      setVuelosSugeridos([]);
    }
  }, [origen, destino, numeroVuelo]);

  // ── Predicción ────────────────────────────────────────────────────────────

  const predecir = useCallback(async ({ airline, avg_delay_minutes, weather_risk, departure_hour, connection_time = 0 }) => {
    const res = await fetch('/api/evaluar_vuelo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airline, avg_delay_minutes, weather_risk, departure_hour, connection_time }),
    });
    const data = await res.json();
    return data.stress_level;
  }, []);

  const analizarRuta = async () => {
    if (!origen || !destino || !aerolinea || !fecha || !hora)
      return alert('Complete origen, destino, aerolínea, fecha y hora.');
    if (origen.value === destino.value) return alert('Origen y destino deben ser distintos.');

    setLoading(true);
    setAlternativas([]);
    setVueloPrevio(null);

    const limpio = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const demo = INFO_VUELOS_SIMULADOS[limpio];
    const demora = demo ? demo.demora : 140;
    const escala = demo ? demo.escala : 0;
    const escalaAeropuerto = demo ? demo.escala_aeropuerto : null;
    const hour = parseInt(hora.split(':')[0]) || 14;

    try {
      const nivel = await predecir({
        airline: aerolinea.value,
        avg_delay_minutes: demora,
        weather_risk: Number(formData.weather),
        departure_hour: hour,
        connection_time: escala,
      });

      const stats = {
        aerolinea: aerolinea.value,
        numero: limpio || '—',
        delay: demora,
        escala,
        escala_aeropuerto: escalaAeropuerto,
        weather: Number(formData.weather),
        hora: hour,
        stress: nivel,
      };
      setVueloOriginal(stats);
      setRutaActiva({
        origenInfo: aeropuertos[origen.value],
        destinoInfo: aeropuertos[destino.value],
        escalaInfo: escalaAeropuerto ? aeropuertos[escalaAeropuerto] : null,
        stats,
        color: '#dc2626',
      });
    } catch (e) {
      console.error(e);
      alert('Error al evaluar el vuelo. Verificá que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const buscarAlternativas = async () => {
    if (!vueloOriginal) return;
    try {
      const res = await fetch(`/api/recomendaciones?origen=${origen.value}&destino=${destino.value}`);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const filtradas = data.filter(
        alt => alt.avg_delay_minutes <= 45 || alt.avg_delay_minutes < (vueloOriginal.delay - 60)
      );
      if (!filtradas.length) alert('No hay opciones significativamente mejores para esta ruta.');
      setAlternativas(filtradas);
    } catch (e) { console.error(e); }
  };

  // ── Intercambio de vuelo ──────────────────────────────────────────────────
  // Al tocar una alternativa: re-predice en vivo y la carga como vuelo activo.

  const intercambiarVuelo = async (alt) => {
    setLoadingAlt(true);
    try {
      const hour = vueloOriginal?.hora ?? 14;
      const nivel = await predecir({
        airline: alt.airline,
        avg_delay_minutes: alt.avg_delay_minutes,
        weather_risk: Number(formData.weather),
        departure_hour: hour,
        connection_time: alt.connection_time ?? 0,
      });

      const statsNuevo = {
        aerolinea: alt.airline,
        numero: '—',
        delay: alt.avg_delay_minutes,
        escala: alt.connection_time ?? 0,
        escala_aeropuerto: null,
        weather: Number(formData.weather),
        hora: hour,
        stress: nivel,
      };

      // Guarda el vuelo anterior si no había uno previo ya guardado.
      setVueloPrevio(prev => prev ?? vueloOriginal);
      setVueloOriginal(statsNuevo);
      setAerolinea({ value: alt.airline, label: alt.airline });
      setAlternativas([]);

      setRutaActiva({
        origenInfo: aeropuertos[alt.origin_airport] ?? aeropuertos[origen?.value],
        destinoInfo: aeropuertos[alt.destination_airport] ?? aeropuertos[destino?.value],
        escalaInfo: null,
        stats: statsNuevo,
        color: '#16a34a',
      });
    } catch (e) { console.error(e); }
    finally { setLoadingAlt(false); }
  };

  const volverAlOriginal = () => {
    if (!vueloPrevio) return;
    setVueloOriginal(vueloPrevio);
    setAerolinea({ value: vueloPrevio.aerolinea, label: vueloPrevio.aerolinea });
    setRutaActiva(r => r ? {
      ...r,
      origenInfo: aeropuertos[origen?.value],
      destinoInfo: aeropuertos[destino?.value],
      escalaInfo: vueloPrevio.escala_aeropuerto ? aeropuertos[vueloPrevio.escala_aeropuerto] : null,
      stats: vueloPrevio,
      color: '#dc2626',
    } : r);
    setVueloPrevio(null);
    setAlternativas([]);
  };

  // ── Polilínea curva ───────────────────────────────────────────────────────

  const posicionesRuta = useMemo(() => {
    if (!rutaActiva) return [];
    const { origenInfo, escalaInfo, destinoInfo } = rutaActiva;
    if (!origenInfo || !destinoInfo) return [];
    if (escalaInfo) {
      return [...puntosArco(origenInfo, escalaInfo), ...puntosArco(escalaInfo, destinoInfo)];
    }
    return puntosArco(origenInfo, destinoInfo);
  }, [rutaActiva]);

  // ─── Utilidad de color por nivel ──────────────────────────────────────────
  const colorNivel = (nivel) =>
    nivel === 'High' ? '#dc2626' : nivel === 'Medium' ? '#d97706' : '#16a34a';
  const bgNivel = (nivel) =>
    nivel === 'High' ? '#fee2e2' : nivel === 'Medium' ? '#fef3c7' : '#dcfce7';
  const iconoNivel = (nivel) =>
    nivel === 'High' ? '🔴' : nivel === 'Medium' ? '🟠' : '🟢';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--sans)', background: 'var(--bg)', position: 'relative' }}>

      {/* ── MODAL ITINERARIO ── */}
      {showModal && rutaActiva && vueloOriginal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: '#fff', width: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 14, padding: '28px 28px 24px', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1a202c' }}>Itinerario Detallado</h2>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#718096' }}>{vueloOriginal.aerolinea}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#718096', lineHeight: 1 }}>✕</button>
            </div>

            {/* Gauge en el modal */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 24px' }}>
              <GaugeRiesgo nivel={vueloOriginal.stress} />
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '3px solid #e2e8f0', marginLeft: 12 }}>
              {[
                { label: '🛫 Despegue', info: rutaActiva.origenInfo, dot: '#2563eb', extra: `Demora histórica: ${vueloOriginal.delay} min` },
                rutaActiva.escalaInfo ? { label: '⏱ Escala', info: rutaActiva.escalaInfo, dot: '#d97706', extra: `Duración: ${vueloOriginal.escala} min` } : null,
                { label: '🛬 Aterrizaje', info: rutaActiva.destinoInfo, dot: '#16a34a', extra: null },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
                  <div style={{ position: 'absolute', left: -33, top: 2, width: 14, height: 14, borderRadius: '50%', background: item.dot, border: '3px solid white', boxShadow: '0 0 0 2px ' + item.dot + '33' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a202c' }}>{item.label}: {item.info?.name?.split('(')[0]}</div>
                  <div style={{ fontSize: 12, color: '#718096' }}>{item.info?.id}</div>
                  {item.extra && <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{item.extra}</div>}
                </div>
              ))}
            </div>

            <button onClick={() => setShowModal(false)}
              style={{ ...S.btnPrimary, width: '100%', marginTop: 8 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={S.sidebar}>

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.headerTitle}>✈️ FlightRisk</h2>
          <p style={S.headerTag}>Riesgo operacional y experiencia de viaje</p>
        </div>

        {/* Formulario */}
        <div style={S.form}>
          <div>
            <label style={S.label}>Nº de Vuelo (opcional)</label>
            <input style={S.input} type="text" value={numeroVuelo}
              onChange={e => setNumeroVuelo(e.target.value)}
              placeholder="AC850, IB620, UA110…" />
          </div>

          <div style={{ zIndex: 310 }}>
            <label style={S.label}>Aerolínea</label>
            <Select options={opcionesAerolineas} value={aerolinea} onChange={setAerolinea}
              placeholder="Buscar aerolínea…" isClearable isSearchable
              styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          <div style={{ zIndex: 300 }}>
            <label style={S.label}>Desde</label>
            <Select options={opcionesAeropuertos} value={origen} onChange={setOrigen}
              placeholder="Aeropuerto de origen…" isClearable isSearchable
              styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          <div style={{ zIndex: 290 }}>
            <label style={S.label}>Hacia</label>
            <Select options={opcionesAeropuertos} value={destino} onChange={setDestino}
              placeholder="Aeropuerto de destino…" isClearable isSearchable
              styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          {/* Vuelos sugeridos */}
          {vuelosSugeridos.length > 0 && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.05em' }}>Vuelos disponibles</div>
              {vuelosSugeridos.map(v => (
                <div key={v.numero} onClick={() => setNumeroVuelo(v.numero)}
                  style={{ padding: '7px 10px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
                  <strong style={{ color: '#1d4ed8' }}>{v.numero}</strong> — {v.aerolinea}
                  <span style={{ color: '#718096', marginLeft: 6 }}>
                    {v.escala === 0 ? 'Directo' : `Escala ${v.escala}m en ${v.escala_aeropuerto}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Fecha</label>
              <input style={S.input} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Hora</label>
              <input style={S.input} type="time" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
          </div>

          <button onClick={analizarRuta} disabled={loading}
            style={{ ...S.btnPrimary, marginTop: 4, opacity: loading ? .7 : 1 }}>
            {loading ? '⏳ Calculando…' : '🔍 Analizar Riesgo'}
          </button>
        </div>

        {/* ── Resultados ── */}
        <div style={{ paddingTop: 16 }}>

          {/* Tarjeta vuelo actual */}
          {vueloOriginal && (
            <div style={S.card}>
              {/* Franja "volviste al original" / "intercambiado" */}
              {vueloPrevio && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 10px', marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>✅ Vuelo intercambiado</span>
                  <button onClick={volverAlOriginal} style={{ ...S.btnMuted, padding: '3px 10px', fontSize: 11 }}>← Volver al original</button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>{vueloOriginal.aerolinea}</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    {vueloOriginal.numero !== '—' ? `Vuelo ${vueloOriginal.numero} · ` : ''}
                    Demora: {vueloOriginal.delay} min
                  </div>
                </div>
                <button onClick={() => setShowModal(true)} style={S.btnMuted}>🔍 Itinerario</button>
              </div>

              {/* Gauge */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 12px' }}>
                <GaugeRiesgo nivel={vueloOriginal.stress} />
              </div>

              {/* Delta comparativo si hay vuelo previo */}
              {vueloPrevio && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: bgNivel(vueloPrevio.stress), borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#718096', fontWeight: 600, marginBottom: 2 }}>ANTERIOR</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colorNivel(vueloPrevio.stress) }}>
                      {iconoNivel(vueloPrevio.stress)} {vueloPrevio.stress}
                    </div>
                    <div style={{ fontSize: 11, color: '#718096' }}>{vueloPrevio.delay} min</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, color: '#a0aec0' }}>→</div>
                  <div style={{ flex: 1, background: bgNivel(vueloOriginal.stress), borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#718096', fontWeight: 600, marginBottom: 2 }}>NUEVO</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colorNivel(vueloOriginal.stress) }}>
                      {iconoNivel(vueloOriginal.stress)} {vueloOriginal.stress}
                    </div>
                    <div style={{ fontSize: 11, color: '#718096' }}>{vueloOriginal.delay} min</div>
                  </div>
                </div>
              )}

              {vueloOriginal.stress !== 'Low' && !vueloPrevio && (
                <button onClick={buscarAlternativas} style={S.btnDanger}>
                  🔄 Buscar Alternativas Mejores
                </button>
              )}
            </div>
          )}

          {/* Lista de alternativas */}
          {alternativas.length > 0 && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                Mejores opciones para esta ruta
              </div>
              {alternativas.map((alt, i) => (
                <div key={i} onClick={() => intercambiarVuelo(alt)}
                  style={{ padding: '11px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: 7, cursor: loadingAlt ? 'wait' : 'pointer', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,.05)', transition: 'border-color .15s', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1a202c' }}>✈️ {alt.airline}</div>
                    <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>Demora: {alt.avg_delay_minutes} min</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colorNivel(alt.stress_level) }}>
                      {iconoNivel(alt.stress_level)} {alt.stress_level}
                    </div>
                    <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>Tocar para intercambiar</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loadingAlt && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 13, color: '#718096' }}>
              ⏳ Recalculando…
            </div>
          )}
        </div>
      </div>

      {/* ── MAPA ── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <AjustarVista rutaActiva={rutaActiva} />

          {/* Marcadores de la ruta activa */}
          {rutaActiva?.origenInfo && (
            <Marker position={[rutaActiva.origenInfo.lat, rutaActiva.origenInfo.lon]} icon={crearIcono('origen')}>
              <Popup>
                <div className="popup-body">
                  <strong>🛫 Origen — {rutaActiva.origenInfo.id}</strong>
                  {rutaActiva.origenInfo.name}
                </div>
              </Popup>
            </Marker>
          )}
          {rutaActiva?.destinoInfo && (
            <Marker position={[rutaActiva.destinoInfo.lat, rutaActiva.destinoInfo.lon]} icon={crearIcono('destino')}>
              <Popup>
                <div className="popup-body">
                  <strong>🛬 Destino — {rutaActiva.destinoInfo.id}</strong>
                  {rutaActiva.destinoInfo.name}
                </div>
              </Popup>
            </Marker>
          )}
          {rutaActiva?.escalaInfo && (
            <Marker position={[rutaActiva.escalaInfo.lat, rutaActiva.escalaInfo.lon]} icon={crearIcono('escala')}>
              <Popup>
                <div className="popup-body">
                  <strong>⏱ Escala — {rutaActiva.escalaInfo.id}</strong>
                  {rutaActiva.escalaInfo.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Polilínea curva animada */}
          {posicionesRuta.length >= 2 && (
            <Polyline
              positions={posicionesRuta}
              pathOptions={{
                color: rutaActiva?.color ?? '#dc2626',
                weight: 3,
                dashArray: '10 8',
                className: 'ruta-activa',
              }}
            />
          )}
        </MapContainer>

        {/* Leyenda flotante */}
        <div style={{ position: 'absolute', bottom: 24, right: 16, zIndex: 900, background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.12)', fontSize: 12, minWidth: 140 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a202c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Referencias</div>
          {[['marker-origen','🛫','Origen'],['marker-escala','⏱','Escala'],['marker-destino','🛬','Destino']].map(([cls, ico, lbl]) => (
            <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cls === 'marker-origen' ? '#2563eb' : cls === 'marker-destino' ? '#16a34a' : '#d97706', flexShrink: 0 }} />
              <span style={{ color: '#4a5568' }}>{ico} {lbl}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8 }}>
            {[['#dc2626','🔴 Riesgo alto'],['#16a34a','🟢 Riesgo bajo']].map(([c, lbl]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 24, height: 3, background: c, borderRadius: 2 }} />
                <span style={{ color: '#4a5568' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
