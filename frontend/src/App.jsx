import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import Select from 'react-select'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Arreglo para los íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-shadow.png',
});

// Nuestro dataset de aeropuertos base
const AEROPUERTOS = {
  'EZE': { id: 'EZE', lat: -34.8222, lon: -58.5358, name: 'Buenos Aires, Argentina (EZE)' },
  'MIA': { id: 'MIA', lat: 25.7959, lon: -80.2870, name: 'Miami, Estados Unidos (MIA)' },
  'JFK': { id: 'JFK', lat: 40.6413, lon: -73.7781, name: 'New York, Estados Unidos (JFK)' },
  'MAD': { id: 'MAD', lat: 40.4839, lon: -3.5679, name: 'Madrid, España (MAD)' },
  'GRU': { id: 'GRU', lat: -23.4356, lon: -46.4731, name: 'São Paulo, Brasil (GRU)' },
  'AEP': { id: 'AEP', lat: -34.5592, lon: -58.4156, name: 'Buenos Aires, Aeroparque (AEP)' },
  'BRC': { id: 'BRC', lat: -41.1512, lon: -71.1576, name: 'Bariloche, Argentina (BRC)' }
};

const opcionesAeropuertos = Object.values(AEROPUERTOS).map(a => ({
  value: a.id, label: a.name
}));

// DICCIONARIO AMPLIADO: Ahora incluye el origen, destino y la demora histórica real de cada vuelo
const INFO_VUELOS_SIMULADOS = {
  'AR1132': { escala: 0, aerolinea: 'Aerolíneas Argentinas', origen: 'EZE', destino: 'MAD', demora: 150 },
  'IB313':  { escala: 120, aerolinea: 'Iberia', origen: 'EZE', destino: 'MAD', demora: 40 },
  'UX042':  { escala: 60, aerolinea: 'Air Europa', origen: 'EZE', destino: 'MAD', demora: 25 },
  'FO5020': { escala: 0, aerolinea: 'Flybondi', origen: 'AEP', destino: 'BRC', demora: 110 },
  'AA900':  { escala: 180, aerolinea: 'American Airlines', origen: 'EZE', destino: 'MIA', demora: 35 }
};

function App() {
  // Estados de tu UI
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [numeroVuelo, setNumeroVuelo] = useState("");
  
  // NUEVO ESTADO: Vuelos disponibles para mostrarle al usuario
  const [vuelosSugeridos, setVuelosSugeridos] = useState([]);

  const [rutaActiva, setRutaActiva] = useState(null);
  const [formData, setFormData] = useState({ delay: 150, weather: 0.9 });
  const [vueloOriginal, setVueloOriginal] = useState(null);
  const [alternativas, setAlternativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vueloRecomendadoSeleccionado, setVueloRecomendadoSeleccionado] = useState(null);

  // 1. AUTOCOMPLETADO DE RUTA: Si escribo el vuelo, se llenan Origen y Destino
  useEffect(() => {
    const vueloLimpio = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const infoVuelo = INFO_VUELOS_SIMULADOS[vueloLimpio];
    
    if (infoVuelo) {
      setOrigen(opcionesAeropuertos.find(a => a.value === infoVuelo.origen));
      setDestino(opcionesAeropuertos.find(a => a.value === infoVuelo.destino));
    }
  }, [numeroVuelo]);

  // 2. DESCUBRIMIENTO DE VUELOS: Si pongo Origen y Destino, busco qué vuelos hay en esa ruta
  useEffect(() => {
    if (origen && destino && numeroVuelo === "") {
      const disponibles = Object.entries(INFO_VUELOS_SIMULADOS)
        .filter(([_, info]) => info.origen === origen.value && info.destino === destino.value)
        .map(([num, info]) => ({ numero: num, ...info }));
      
      setVuelosSugeridos(disponibles);
    } else {
      setVuelosSugeridos([]); // Ocultamos la lista si ya hay un número de vuelo escrito
    }
  }, [origen, destino, numeroVuelo]);


  const analizarRuta = async () => {
    if (!origen || !destino || !fecha || !hora || !numeroVuelo) {
      alert("Por favor complete todos los datos del vuelo (Origen, Destino, Fecha, Hora y Número de vuelo).");
      return;
    }
    if (origen.value === destino.value) {
      alert("El origen y destino deben ser diferentes");
      return;
    }

    setLoading(true);
    setAlternativas([]);
    setVueloRecomendadoSeleccionado(null);

    const vueloLimpiado = numeroVuelo.toUpperCase().replace(/\s/g, '');
    const datosSimulados = INFO_VUELOS_SIMULADOS[vueloLimpiado];
    
    const escalaAutomatica = datosSimulados ? datosSimulados.escala : 0;
    const aerolineaAutomatica = datosSimulados ? datosSimulados.aerolinea : "Aerolínea Desconocida";
    // Tomamos la demora del diccionario. Si no existe, usamos la demora simulada por defecto.
    const demoraFinal = datosSimulados ? datosSimulados.demora : Number(formData.delay);

    const payload = {
      avg_delay_minutes: demoraFinal,
      cancellation_rate: 0.1,
      connection_time: escalaAutomatica, 
      airport_congestion: 0.8,
      weather_risk: Number(formData.weather),
      sentiment_score: 0.3,
      baggage_complaints: 5,
      departure_hour: parseInt(hora.split(":")[0]) || 14
    };

    try {
      const response = await fetch('/api/evaluar_vuelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      const statsOriginales = { 
        aerolinea: aerolineaAutomatica,
        numero: vueloLimpiado,
        delay: payload.avg_delay_minutes, 
        escala: payload.connection_time,
        weather: payload.weather_risk, 
        stress: data.stress_level 
      };

      setVueloOriginal(statsOriginales);

      setRutaActiva({
        origenInfo: AEROPUERTOS[origen.value],
        destinoInfo: AEROPUERTOS[destino.value],
        stats: statsOriginales,
        colorLiena: "red"
      });
    } catch (error) {
      console.error("Error al evaluar el vuelo:", error);
    } finally {
      setLoading(false);
    }
  };

  const buscarAlternativas = async () => {
    try {
      const url = `/api/recomendaciones?origen=${origen.value}&destino=${destino.value}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const alternativasFiltradas = data.filter(alt => 
        alt.avg_delay_minutes <= 45 || alt.avg_delay_minutes < (vueloOriginal.delay - 60)
      );

      if (alternativasFiltradas.length === 0) {
        alert("El sistema analizó las alternativas, pero ninguna mejora el tiempo de manera significativa para esta fecha.");
      }

      setAlternativas(alternativasFiltradas);
    } catch (error) {
      console.error("Error al buscar alternativas:", error);
    }
  };

  const seleccionarRecomendacion = (alt) => {
    setVueloRecomendadoSeleccionado(alt);
    setRutaActiva({
      origenInfo: AEROPUERTOS[alt.origin_airport],
      destinoInfo: AEROPUERTOS[alt.destination_airport],
      stats: {
        aerolinea: alt.airline,
        delay: alt.avg_delay_minutes,
        escala: alt.connection_time,
        stress: alt.Stress_Level
      },
      colorLiena: "green"
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f5f7fa' }}>
      
      {/* PANEL LATERAL */}
      <div style={{ width: '420px', padding: '20px', backgroundColor: '#ffffff', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1a202c' }}>✈️ FlightRisk</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Nº de Vuelo Original:</label>
            <input type="text" value={numeroVuelo} onChange={(e) => setNumeroVuelo(e.target.value)} placeholder="Ej: IB313 o dejalo en blanco para buscar" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div style={{ zIndex: 100 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Desde:</label>
            <Select options={opcionesAeropuertos} value={origen} onChange={setOrigen} placeholder="Origen..." isClearable isSearchable />
          </div>

          <div style={{ zIndex: 90 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Hacia:</label>
            <Select options={opcionesAeropuertos} value={destino} onChange={setDestino} placeholder="Destino..." isClearable isSearchable />
          </div>

          {/* LISTA DINÁMICA DE VUELOS DISPONIBLES (Aparece si no pusiste número de vuelo) */}
          {vuelosSugeridos.length > 0 && (
            <div style={{ backgroundColor: '#ebf8ff', padding: '10px', borderRadius: '6px', border: '1px solid #90cdf4' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#2b6cb0' }}>Vuelos disponibles en esta ruta:</h4>
              {vuelosSugeridos.map(v => (
                <div 
                  key={v.numero} 
                  onClick={() => setNumeroVuelo(v.numero)}
                  style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #bee3f8', borderRadius: '4px', marginBottom: '5px', cursor: 'pointer', fontSize: '12px' }}
                >
                  <strong>{v.numero} - {v.aerolinea}</strong> <br/>
                  <span style={{color: '#c53030'}}>Demora histórica: {v.demora} min</span> | {v.escala === 0 ? "Directo" : `Escala: ${v.escala}m`}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Fecha:</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Hora de salida:</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
          </div>

          <button onClick={analizarRuta} disabled={loading} style={{ padding: '12px', marginTop: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Calculando Riesgo...' : 'Analizar Riesgo'}
          </button>
        </div>

        {/* RESTO DE LA INTERFAZ (RESULTADOS, BOTONES Y MAPA) SIGUEN EXACTAMENTE IGUAL */}
        {vueloOriginal && !vueloRecomendadoSeleccionado && (
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px' }}>Diagnóstico del Vuelo {vueloOriginal.numero}</h3>
            <p style={{ fontSize: '14px', color: '#4a5568', margin: '0 0 5px 0' }}>Operado por: <strong>{vueloOriginal.aerolinea}</strong></p>
            <p style={{ fontSize: '14px', color: '#2b6cb0', margin: '0 0 10px 0' }}>
              Trayecto: <strong>{vueloOriginal.escala === 0 ? "Vuelo Directo 🛫" : `Escala detectada: ${vueloOriginal.escala} min ⏱️`}</strong>
            </p>
            
            <div style={{ margin: '15px 0' }}>
              <span style={{
                display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px',
                backgroundColor: vueloOriginal.stress === 'High' ? '#fed7d7' : vueloOriginal.stress === 'Medium' ? '#feebc8' : '#c6f6d5',
                color: vueloOriginal.stress === 'High' ? '#c53030' : vueloOriginal.stress === 'Medium' ? '#dd6b20' : '#2f855a'
              }}>
                Nivel de Estrés: {vueloOriginal.stress === 'Low' ? '🟢 Bajo' : vueloOriginal.stress === 'Medium' ? '🟡 Medio' : '🔴 Alto'}
              </span>
            </div>

            {vueloOriginal.stress !== 'Low' && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ fontSize: '13px', color: '#c53030', margin: '0 0 10px 0' }}>⚠️ Alto riesgo operativo detectado para esta ruta.</p>
                <button onClick={buscarAlternativas} style={{ backgroundColor: '#e53e3e', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Buscar Alternativas Mejores
                </button>
              </div>
            )}
          </div>
        )}

        {vueloRecomendadoSeleccionado && (
          <div style={{ padding: '20px', border: '2px solid #38a169', borderRadius: '8px', backgroundColor: '#f0fff4', marginTop: '10px' }}>
             <h3 style={{ marginTop: 0, fontSize: '16px', color: '#276749' }}>Comparativa de Vuelos</h3>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
               <div style={{ width: '48%', padding: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                 <strong style={{ color: '#c53030' }}>❌ Original ({vueloOriginal.aerolinea})</strong><br/>
                 Estrés: {vueloOriginal.stress}<br/>
                 Demora: {vueloOriginal.delay} min<br/>
                 {vueloOriginal.escala === 0 ? "Directo" : `Escala: ${vueloOriginal.escala}m`}
               </div>
               <div style={{ width: '48%', padding: '10px', backgroundColor: '#c6f6d5', border: '1px solid #9ae6b4', borderRadius: '5px' }}>
                 <strong style={{ color: '#2f855a' }}>✅ Recomendado</strong><br/>
                 Aerolínea: {vueloRecomendadoSeleccionado.airline}<br/>
                 Estrés: {vueloRecomendadoSeleccionado.Stress_Level}<br/>
                 Demora: {vueloRecomendadoSeleccionado.avg_delay_minutes} min<br/>
                 {vueloRecomendadoSeleccionado.connection_time === 0 ? "Directo" : `Escala: ${vueloRecomendadoSeleccionado.connection_time}m`}
               </div>
             </div>
             <button onClick={() => setVueloRecomendadoSeleccionado(null)} style={{ backgroundColor: '#718096', color: 'white', padding: '8px', width: '100%', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
                Volver al Vuelo Original
             </button>
          </div>
        )}

        {alternativas.length > 0 && !vueloRecomendadoSeleccionado && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2f855a' }}>Rutas Mejoradas Recomendadas:</h4>
            {alternativas.map((alt, idx) => (
              <div 
                key={idx} 
                onClick={() => seleccionarRecomendacion(alt)}
                style={{ 
                  padding: '12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e0', borderRadius: '6px', 
                  marginBottom: '8px', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <strong>✈️ {alt.airline}</strong> <br/>
                <span style={{ color: '#4a5568' }}>
                  Sale de: <strong>{alt.origin_airport}</strong> a las {alt.departure_hour}:00hs | Demora Histórica: {alt.avg_delay_minutes} min
                </span>
                <br/>
                <span style={{ color: '#2b6cb0', fontWeight: 'bold' }}>
                  {alt.connection_time === 0 ? "🛫 Vuelo Directo" : `⏱️ Escala de ${alt.connection_time} minutos`}
                </span>
                <br/>
                <span style={{ color: '#2f855a', fontWeight: 'bold' }}>Nivel de Estrés: 🟢 Low</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ÁREA DEL MAPA */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer center={[10, -40]} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {Object.values(AEROPUERTOS).map(aeropuerto => (
            <Marker key={aeropuerto.id} position={[aeropuerto.lat, aeropuerto.lon]}>
              <Popup>{aeropuerto.name}</Popup>
            </Marker>
          ))}

          {rutaActiva && (
            <Polyline 
              positions={[
                [rutaActiva.origenInfo.lat, rutaActiva.origenInfo.lon],
                [rutaActiva.destinoInfo.lat, rutaActiva.destinoInfo.lon]
              ]} 
              color={rutaActiva.colorLiena} 
              weight={4} 
              dashArray="10, 10"
            />
          )}
        </MapContainer>
      </div>
      
    </div>
  )
}

export default App