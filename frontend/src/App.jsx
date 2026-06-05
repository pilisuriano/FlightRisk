import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Arreglo para los íconos por defecto de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.71.1/images/marker-shadow.png',
});

function App() {
  const [vuelosDB, setVuelosDB] = useState([]);
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [rutaActiva, setRutaActiva] = useState(null);

  useEffect(() => {
    fetch('/api/vuelos')
      .then(res => {
        if (!res.ok) throw new Error("Error al conectar con la API");
        return res.json();
      })
      .then(data => setVuelos(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>      
    <h1>✈️ Centro de Control Operativo - FlightRisk</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {/* MAPA MUNDIAL INTERACTIVO */}
      <div style={{ height: '450px', width: '100%', marginBottom: '30px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MapContainer center={[10, -40]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vuelos.slice(0, 50).map((vuelo, index) => (
            <Marker key={index} position={[vuelo.dest_lat, vuelo.dest_lon]}>
              <Popup>
                <strong>{vuelo.airline}</strong><br />
                Destino: {vuelo.destination}<br />
                Riesgo de Estrés: <span style={{ color: vuelo.stress === 'High' ? 'red' : 'orange' }}>{vuelo.stress}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* DASHBOARD DE TARJETAS ABAJO */}
      <h2>Lista de Alertas en Tiempo Real</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {vuelos.slice(0, 15).map((vuelo, index) => (
          <div key={index} style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{vuelo.airline}: {vuelo.origin} ➡️ {vuelo.destination}</h3>
            <span style={{
              fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
              backgroundColor: vuelo.stress === 'High' ? '#ffebee' : vuelo.stress === 'Medium' ? '#fff3e0' : '#e8f5e9',
              color: vuelo.stress === 'High' ? '#c62828' : vuelo.stress === 'Medium' ? '#ef6c00' : '#2e7d32'
            }}>
              Estrés: {vuelo.stress}
            </span>
            <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#666' }}>
              Delay: {vuelo.delay}m | Clima: {vuelo.weather.toFixed(2)} | Congestión: {vuelo.congestion.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* ÁREA DEL MAPA */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={[10, -40]} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Pintamos todos los aeropuertos en el mapa */}
          {Object.values(AEROPUERTOS).map(aeropuerto => (
            <Marker key={aeropuerto.id} position={[aeropuerto.lat, aeropuerto.lon]}>
              <Popup>{aeropuerto.name}</Popup>
            </Marker>
          ))}

          {/* Si hay una ruta activa, dibujamos la línea roja conectándolos */}
          {rutaActiva && (
            <Polyline 
              positions={[
                [rutaActiva.origenInfo.lat, rutaActiva.origenInfo.lon],
                [rutaActiva.destinoInfo.lat, rutaActiva.destinoInfo.lon]
              ]} 
              color="red" 
              weight={4} 
              dashArray="10, 10" // Hace que la línea sea punteada
            />
          )}
        </MapContainer>
      </div>
      
    </div>
  )
}

export default App
