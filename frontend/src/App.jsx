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
  'GRU': { id: 'GRU', lat: -23.4356, lon: -46.4731, name: 'São Paulo, Brasil (GRU)' }
};

// Formateamos los datos para que el buscador inteligente los entienda
const opcionesAeropuertos = Object.values(AEROPUERTOS).map(a => ({
  value: a.id,
  label: a.name
}));

function App() {
  const [vuelosDB, setVuelosDB] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutaActiva, setRutaActiva] = useState(null);

  useEffect(() => {
    fetch('/api/vuelos')
      .then(res => res.json())
      .then(data => setVuelosDB(data))
      .catch(err => console.error("Error cargando IA:", err));
  }, []);

  const analizarRuta = () => {
    if (!origen || !destino) {
      alert("Por favor seleccione origen y destino");
      return;
    }
    if (origen.value === destino.value) {
      alert("El origen y destino deben ser diferentes");
      return;
    }

    const dataModelo = vuelosDB.length > 0 
      ? vuelosDB[Math.floor(Math.random() * vuelosDB.length)] 
      : { delay: 45, weather: 0.8, congestion: 0.6, stress: 'High' };

    setRutaActiva({
      origenInfo: AEROPUERTOS[origen.value],
      destinoInfo: AEROPUERTOS[destino.value],
      stats: dataModelo
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f5f7fa' }}>
      
      {/* PANEL LATERAL (SIDEBAR) */}
      <div style={{ width: '350px', padding: '20px', backgroundColor: '#ffffff', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1a202c' }}>✈️ FlightRisk</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
          <div style={{ zIndex: 100 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Desde:</label>
            <Select 
              options={opcionesAeropuertos}
              value={origen}
              onChange={setOrigen}
              placeholder="Escriba ciudad o código..."
              isClearable
              isSearchable
            />
          </div>

          <div style={{ zIndex: 90 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#4a5568' }}>Hacia:</label>
            <Select 
              options={opcionesAeropuertos}
              value={destino}
              onChange={setDestino}
              placeholder="Escriba ciudad o código..."
              isClearable
              isSearchable
            />
          </div>

          <button 
            onClick={analizarRuta}
            style={{ padding: '12px', marginTop: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Analizar Riesgo
          </button>
        </div>

        {/* TARJETA DE RESULTADO */}
        {rutaActiva && (
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px' }}>Ruta Analizada</h3>
            <p style={{ fontSize: '14px', color: '#4a5568', margin: '5px 0' }}>
              {rutaActiva.origenInfo.id} ➡️ {rutaActiva.destinoInfo.id}
            </p>
            
            <div style={{ margin: '15px 0' }}>
              <span style={{
                display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px',
                backgroundColor: rutaActiva.stats.stress === 'High' ? '#fed7d7' : rutaActiva.stats.stress === 'Medium' ? '#feebc8' : '#c6f6d5',
                color: rutaActiva.stats.stress === 'High' ? '#c53030' : rutaActiva.stats.stress === 'Medium' ? '#dd6b20' : '#2f855a'
              }}>
                Nivel de Estrés: {rutaActiva.stats.stress}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}>⏱️ Delay Estimado: <strong>{rutaActiva.stats.delay} min</strong></p>
              <p style={{ margin: 0 }}>⛈️ Factor Clima: <strong>{rutaActiva.stats.weather?.toFixed(2)}</strong></p>
              <p style={{ margin: 0 }}>🚦 Congestión: <strong>{rutaActiva.stats.congestion?.toFixed(2)}</strong></p>
            </div>
          </div>
        )}
      </div>

      {/* ÁREA DEL MAPA */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer center={[10, -40]} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
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
              color="red" 
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
