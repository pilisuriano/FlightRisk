import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import Select from 'react-select'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Arreglo para los íconos de Leaflet (usar la versión real 1.9.4, no la 1.71.1)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// DICCIONARIO DEMO (atajo opcional): vuelos de ejemplo para autocompletar.
// Usan RUTAS REALES presentes en flights_dataset_final.csv (con alternativas Low),
// y aerolíneas que figuran en el dataset, para que "Buscar Alternativas" devuelva
// resultados. La demora se setea alta a propósito para que el vuelo original
// prediga Medium/High y aparezca el botón de recomendaciones.
// Los aeropuertos de origen/destino/escala existen en el dataset (tienen coords).
const INFO_VUELOS_SIMULADOS = {
  'AC850':  { escala: 0,   aerolinea: 'Air Canada',      origen: 'ORD', destino: 'SFO', demora: 140, escala_aeropuerto: null },
  'IB620':  { escala: 90,  aerolinea: 'Iberia',          origen: 'NRT', destino: 'ITM', demora: 150, escala_aeropuerto: 'PKX' },
  'UA110':  { escala: 120, aerolinea: 'United Airlines', origen: 'IST', destino: 'CDG', demora: 145, escala_aeropuerto: 'FRA' },
  'EK730':  { escala: 0,   aerolinea: 'Emirates',        origen: 'HRE', destino: 'JNB', demora: 160, escala_aeropuerto: null },
  'MF820':  { escala: 60,  aerolinea: 'Xiamen Air',      origen: 'NKG', destino: 'PKX', demora: 140, escala_aeropuerto: 'PVG' }
};

function App() {
  // Aeropuertos y aerolíneas reales se cargan desde el backend (datos del dataset).
  const [aeropuertos, setAeropuertos] = useState({}); // { IATA: { id, lat, lon, name } }
  const [opcionesAerolineas, setOpcionesAerolineas] = useState([]);

  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [aerolinea, setAerolinea] = useState(null);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [numeroVuelo, setNumeroVuelo] = useState("");
  const [vuelosSugeridos, setVuelosSugeridos] = useState([]);
  const [rutaActiva, setRutaActiva] = useState(null);
  const [formData, setFormData] = useState({ delay: 150, weather: 0.9 });
  const [vueloOriginal, setVueloOriginal] = useState(null);
  const [alternativas, setAlternativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vueloRecomendadoSeleccionado, setVueloRecomendadoSeleccionado] = useState(null);

  // NUEVO ESTADO: Controla si el Modal de detalles está abierto o cerrado
  const [showModal, setShowModal] = useState(false);

  const opcionesAeropuertos = useMemo(
    () => Object.values(aeropuertos).map(a => ({ value: a.id, label: a.name })),
    [aeropuertos]
  );

  // Carga inicial: aeropuertos (con coords) y aerolíneas reales del dataset.
  useEffect(() => {
    fetch('/api/aeropuertos')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const mapa = {};
        data.forEach(a => {
          const ciudad = a.city && a.city !== 'nan' ? a.city : a.iata;
          const pais = a.country && a.country !== 'nan' ? `, ${a.country}` : '';
          mapa[a.iata] = {
            id: a.iata,
            lat: a.lat,
            lon: a.lon,
            name: `${ciudad}${pais} (${a.iata})`
          };
        });
        setAeropuertos(mapa);
      })
      .catch(err => console.error('Error cargando aeropuertos:', err));

    fetch('/api/aerolineas')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setOpcionesAerolineas(data.map(a => ({ value: a, label: a })));
      })
      .catch(err => console.error('Error cargando aerolíneas:', err));
  }, []);

  // Atajo demo: al tipear un Nº de vuelo conocido, autocompleta origen/destino/aerolínea.
  useEffect(() => {
    const vueloLimpio = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const infoVuelo = INFO_VUELOS_SIMULADOS[vueloLimpio];
    if (infoVuelo) {
      // Solo seteamos el aeropuerto si existe en el dataset (tiene coords).
      const op = opcionesAeropuertos.find(a => a.value === infoVuelo.origen);
      const dp = opcionesAeropuertos.find(a => a.value === infoVuelo.destino);
      if (op) setOrigen(op);
      if (dp) setDestino(dp);
      setAerolinea({ value: infoVuelo.aerolinea, label: infoVuelo.aerolinea });
    }
  }, [numeroVuelo, opcionesAeropuertos]);

  useEffect(() => {
    if (origen && destino && numeroVuelo === "") {
      const disponibles = Object.entries(INFO_VUELOS_SIMULADOS)
        .filter(([_, info]) => info.origen === origen.value && info.destino === destino.value)
        .map(([num, info]) => ({ numero: num, ...info }));
      setVuelosSugeridos(disponibles);
    } else {
      setVuelosSugeridos([]);
    }
  }, [origen, destino, numeroVuelo]);

  const analizarRuta = async () => {
    if (!origen || !destino || !aerolinea || !fecha || !hora) return alert("Complete origen, destino, aerolínea, fecha y hora.");
    if (origen.value === destino.value) return alert("Origen y destino deben ser diferentes");

    setLoading(true);
    setAlternativas([]);
    setVueloRecomendadoSeleccionado(null);

    const vueloLimpiado = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const datosSimulados = INFO_VUELOS_SIMULADOS[vueloLimpiado];

    // Si hay un vuelo demo, usamos sus valores; si no, los del formulario.
    const escalaAutomatica = datosSimulados ? datosSimulados.escala : 0;
    const demoraFinal = datosSimulados ? datosSimulados.demora : Number(formData.delay);
    const aeropuertoEscala = datosSimulados ? datosSimulados.escala_aeropuerto : null;

    // Payload alineado al modelo: aerolínea + features por vuelo.
    // El backend completa las features a nivel aerolínea (Skytrax).
    const payload = {
      airline: aerolinea.value,
      avg_delay_minutes: demoraFinal,
      weather_risk: Number(formData.weather),
      departure_hour: parseInt(hora.split(":")[0]) || 14,
      connection_time: escalaAutomatica
    };

    try {
      const response = await fetch('/api/evaluar_vuelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      const statsOriginales = {
        aerolinea: aerolinea.value, numero: vueloLimpiado || "—", delay: payload.avg_delay_minutes,
        escala: payload.connection_time, weather: payload.weather_risk, stress: data.stress_level,
        escala_aeropuerto: aeropuertoEscala
      };

      setVueloOriginal(statsOriginales);

      setRutaActiva({
        origenInfo: aeropuertos[origen.value],
        destinoInfo: aeropuertos[destino.value],
        // Información geográfica de la escala para el mapa (si existe y tiene coords).
        escalaInfo: aeropuertoEscala ? aeropuertos[aeropuertoEscala] : null,
        stats: statsOriginales,
        colorLiena: "red"
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buscarAlternativas = async () => {
    try {
      const response = await fetch(`/api/recomendaciones?origen=${origen.value}&destino=${destino.value}`);
      const data = await response.json();
      if (!Array.isArray(data)) { alert("No se pudieron obtener alternativas."); return; }
      const alternativasFiltradas = data.filter(alt => alt.avg_delay_minutes <= 45 || alt.avg_delay_minutes < (vueloOriginal.delay - 60));
      if (alternativasFiltradas.length === 0) alert("No hay opciones significativamente mejores.");
      setAlternativas(alternativasFiltradas);
    } catch (error) {
      console.error(error);
    }
  };

  const seleccionarRecomendacion = (alt) => {
    setVueloRecomendadoSeleccionado(alt);

    // Buscamos info de escala en el dict demo si coincide (mejora visual opcional).
    const datosVueloAlt = Object.values(INFO_VUELOS_SIMULADOS).find(v => v.aerolinea === alt.airline && v.escala === alt.connection_time);
    const codigoEscala = datosVueloAlt ? datosVueloAlt.escala_aeropuerto : null;

    setRutaActiva({
      origenInfo: aeropuertos[alt.origin_airport],
      destinoInfo: aeropuertos[alt.destination_airport],
      escalaInfo: codigoEscala ? aeropuertos[codigoEscala] : null,
      stats: { aerolinea: alt.airline, delay: alt.avg_delay_minutes, escala: alt.connection_time, stress: alt.stress_level, escala_aeropuerto: codigoEscala },
      colorLiena: "green"
    });
  };

  // Función auxiliar para determinar los puntos de la línea en el mapa.
  // Filtra puntos sin coordenadas para no romper el render.
  const getPolylinePositions = () => {
    if (!rutaActiva || !rutaActiva.origenInfo || !rutaActiva.destinoInfo) return [];
    const puntos = [rutaActiva.origenInfo];
    if (rutaActiva.escalaInfo) puntos.push(rutaActiva.escalaInfo);
    puntos.push(rutaActiva.destinoInfo);
    return puntos.map(p => [p.lat, p.lon]);
  };

  const getVueloActualStats = () => vueloRecomendadoSeleccionado ? rutaActiva.stats : vueloOriginal;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f5f7fa', position: 'relative' }}>

      {/* EL GRAN MODAL EMERGENTE DE DETALLES (Se muestra solo si showModal es true) */}
      {showModal && rutaActiva && rutaActiva.origenInfo && rutaActiva.destinoInfo && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', width: '500px', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Itinerario Detallado - {getVueloActualStats().aerolinea}
            </h2>

            {/* TIMELINE DE VUELO ACTUALIZADO */}
            <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '3px solid #cbd5e0', marginLeft: '10px', marginBottom: '30px' }}>

              {/* ORIGEN */}
              <div style={{ position: 'relative', marginBottom: rutaActiva.escalaInfo ? '30px' : '0' }}>
                <div style={{ position: 'absolute', left: '-29px', top: '2px', width: '15px', height: '15px', backgroundColor: '#3182ce', borderRadius: '50%' }}></div>
                <h4 style={{ margin: 0 }}>Despegue: {rutaActiva.origenInfo.name.split('(')[0]}</h4>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#4a5568', fontWeight: 'bold' }}>Aeropuerto: {rutaActiva.origenInfo.id}</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#718096' }}>Riesgo histórico de demora: {getVueloActualStats().delay} min</p>
              </div>

              {/* ESCALA (Condicional) */}
              {rutaActiva.escalaInfo && (
                <div style={{ position: 'relative', marginBottom: '30px' }}>
                  <div style={{ position: 'absolute', left: '-29px', top: '2px', width: '15px', height: '15px', backgroundColor: '#ed8936', borderRadius: '50%' }}></div>
                  <h4 style={{ margin: 0, color: '#dd6b20' }}>Escala en: {rutaActiva.escalaInfo.name.split('(')[0]}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#4a5568', fontWeight: 'bold' }}>Aeropuerto: {rutaActiva.escalaInfo.id}</p>
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#718096', fontWeight: 'bold' }}>
                    Duración: {getVueloActualStats().escala} minutos
                  </p>
                </div>
              )}

              {/* DESTINO */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-29px', top: '2px', width: '15px', height: '15px', backgroundColor: '#38a169', borderRadius: '50%' }}></div>
                <h4 style={{ margin: 0 }}>Aterrizaje: {rutaActiva.destinoInfo.name.split('(')[0]}</h4>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#4a5568', fontWeight: 'bold' }}>Aeropuerto: {rutaActiva.destinoInfo.id}</p>
              </div>
            </div>

            {/* SECCIÓN DE RIESGOS */}
            <div style={{ backgroundColor: getVueloActualStats().stress === 'High' ? '#fed7d7' : getVueloActualStats().stress === 'Medium' ? '#feebc8' : '#c6f6d5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <strong style={{ color: getVueloActualStats().stress === 'High' ? '#c53030' : getVueloActualStats().stress === 'Medium' ? '#dd6b20' : '#2f855a' }}>
                Clasificación de Riesgo: {getVueloActualStats().stress}
              </strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#4a5568' }}>
                {getVueloActualStats().stress === 'High' ? "La suma del clima y las demoras históricas de esta aerolínea comprometen la ruta." : "Ruta operativamente segura."}
              </p>
            </div>

            <button onClick={() => setShowModal(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cerrar Detalles
            </button>
          </div>
        </div>
      )}

      {/* PANEL LATERAL (SIDEBAR) */}
      <div style={{ width: '420px', padding: '20px', backgroundColor: '#ffffff', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1a202c' }}>✈️ FlightRisk</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Nº de Vuelo Original:</label>
            <input type="text" value={numeroVuelo} onChange={(e) => setNumeroVuelo(e.target.value)} placeholder="Ej: IB313" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div style={{ zIndex: 110 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Aerolínea:</label>
            <Select options={opcionesAerolineas} value={aerolinea} onChange={setAerolinea} placeholder="Aerolínea..." isClearable isSearchable />
          </div>

          <div style={{ zIndex: 100 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Desde:</label>
            <Select options={opcionesAeropuertos} value={origen} onChange={setOrigen} placeholder="Origen..." isClearable isSearchable />
          </div>

          <div style={{ zIndex: 90 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Hacia:</label>
            <Select options={opcionesAeropuertos} value={destino} onChange={setDestino} placeholder="Destino..." isClearable isSearchable />
          </div>

          {vuelosSugeridos.length > 0 && (
            <div style={{ backgroundColor: '#ebf8ff', padding: '10px', borderRadius: '6px', border: '1px solid #90cdf4' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#2b6cb0' }}>Vuelos disponibles:</h4>
              {vuelosSugeridos.map(v => (
                <div key={v.numero} onClick={() => setNumeroVuelo(v.numero)} style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #bee3f8', borderRadius: '4px', marginBottom: '5px', cursor: 'pointer', fontSize: '12px' }}>
                  <strong>{v.numero} - {v.aerolinea}</strong> <br/>
                  Escala: {v.escala === 0 ? "Directo" : `${v.escala}m en ${v.escala_aeropuerto}`}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
            <div style={{ flex: 1 }}><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
          </div>

          <button onClick={analizarRuta} disabled={loading} style={{ padding: '12px', marginTop: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Calculando Riesgo...' : 'Analizar Riesgo'}
          </button>
        </div>

        {/* TARJETA ORIGINAL REDUCIDA CON BOTÓN DE DETALLES */}
        {vueloOriginal && !vueloRecomendadoSeleccionado && (
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Vuelo {vueloOriginal.numero}</h3>
              <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#edf2f7', border: '1px solid #cbd5e0', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
                🔍 Ver Itinerario
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#4a5568', margin: '10px 0 5px 0' }}>{vueloOriginal.aerolinea}</p>

            <div style={{ margin: '15px 0' }}>
              <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px', backgroundColor: vueloOriginal.stress === 'High' ? '#fed7d7' : vueloOriginal.stress === 'Medium' ? '#feebc8' : '#c6f6d5', color: vueloOriginal.stress === 'High' ? '#c53030' : vueloOriginal.stress === 'Medium' ? '#dd6b20' : '#2f855a' }}>
                Nivel de Estrés: {vueloOriginal.stress}
              </span>
            </div>

            {vueloOriginal.stress !== 'Low' && (
              <button onClick={buscarAlternativas} style={{ backgroundColor: '#e53e3e', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
                Buscar Alternativas Mejores
              </button>
            )}
          </div>
        )}

        {/* TARJETA COMPARATIVA REDUCIDA CON BOTÓN DE DETALLES */}
        {vueloRecomendadoSeleccionado && (
          <div style={{ padding: '20px', border: '2px solid #38a169', borderRadius: '8px', backgroundColor: '#f0fff4', marginTop: '10px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
               <h3 style={{ margin: 0, fontSize: '16px', color: '#276749' }}>Comparativa</h3>
               <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#c6f6d5', border: '1px solid #9ae6b4', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#276749', fontWeight: 'bold' }}>
                 🔍 Ver Detalles
               </button>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
               <div style={{ width: '48%', padding: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                 <strong style={{ color: '#c53030' }}>❌ Original</strong><br/>
                 Estrés: {vueloOriginal.stress}
               </div>
               <div style={{ width: '48%', padding: '10px', backgroundColor: '#c6f6d5', border: '1px solid #9ae6b4', borderRadius: '5px' }}>
                 <strong style={{ color: '#2f855a' }}>✅ {vueloRecomendadoSeleccionado.airline}</strong><br/>
                 Estrés: {vueloRecomendadoSeleccionado.stress_level}
               </div>
             </div>
             <button onClick={() => setVueloRecomendadoSeleccionado(null)} style={{ backgroundColor: '#718096', color: 'white', padding: '8px', width: '100%', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Volver al Original</button>
          </div>
        )}

        {alternativas.length > 0 && !vueloRecomendadoSeleccionado && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2f855a' }}>Mejores opciones:</h4>
            {alternativas.map((alt, idx) => {
              const colorNivel = alt.stress_level === 'High' ? '#c53030' : alt.stress_level === 'Medium' ? '#dd6b20' : '#2f855a';
              const iconoNivel = alt.stress_level === 'High' ? '🔴' : alt.stress_level === 'Medium' ? '🟠' : '🟢';
              return (
                <div key={idx} onClick={() => seleccionarRecomendacion(alt)} style={{ padding: '12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e0', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <strong>✈️ {alt.airline}</strong> <br/>
                  <span style={{ color: colorNivel, fontWeight: 'bold' }}>{iconoNivel} Nivel: {alt.stress_level}</span> | Demora: {alt.avg_delay_minutes}m
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ÁREA DEL MAPA */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer center={[10, -40]} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* MARCADORES DE LA RUTA ACTIVA (origen y destino) */}
          {rutaActiva && rutaActiva.origenInfo && (
            <Marker position={[rutaActiva.origenInfo.lat, rutaActiva.origenInfo.lon]}>
              <Popup><strong>🛫 Origen</strong><br />{rutaActiva.origenInfo.name}</Popup>
            </Marker>
          )}
          {rutaActiva && rutaActiva.destinoInfo && (
            <Marker position={[rutaActiva.destinoInfo.lat, rutaActiva.destinoInfo.lon]}>
              <Popup><strong>🛬 Destino</strong><br />{rutaActiva.destinoInfo.name}</Popup>
            </Marker>
          )}

          {/* DIBUJO DE LÍNEA MULTI-PUNTO (INTELIGENTE) */}
          {rutaActiva && getPolylinePositions().length >= 2 && (
            <Polyline
              positions={getPolylinePositions()}
              color={rutaActiva.colorLiena}
              weight={4}
              dashArray="10, 10"
            />
          )}

          {/* MARCADOR ESPECIAL DE ESCALA */}
          {rutaActiva && rutaActiva.escalaInfo && (
            <Marker position={[rutaActiva.escalaInfo.lat, rutaActiva.escalaInfo.lon]}>
              <Popup>
                <strong>⏱️ Parada de Escala</strong><br />
                {rutaActiva.escalaInfo.name}
              </Popup>
            </Marker>
          )}

        </MapContainer>
      </div>

    </div>
  )
}

export default App
