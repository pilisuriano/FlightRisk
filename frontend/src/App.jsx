import { useState, useEffect } from 'react'

function App() {
  const [vuelos, setVuelos] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    // Llamamos a nuestra API de Python
    fetch('/api/vuelos')
      .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        return res.json();
      })
      .then(data => setVuelos(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>✈️ Dashboard de FlightRisk</h1>
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ display: 'grid', gap: '15px' }}>
        {vuelos.map((vuelo, index) => (
          <div key={index} style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>
              {vuelo.airline}: {vuelo.origin} ➡️ {vuelo.destination}
            </h3>
            
            {/* Pintamos el nivel de estrés según su gravedad */}
            <span style={{ 
              fontWeight: 'bold',
              padding: '5px 10px',
              borderRadius: '4px',
              backgroundColor: vuelo.stress === 'High' ? '#ffebee' : vuelo.stress === 'Medium' ? '#fff3e0' : '#e8f5e9',
              color: vuelo.stress === 'High' ? '#c62828' : vuelo.stress === 'Medium' ? '#ef6c00' : '#2e7d32' 
            }}>
              Nivel de Estrés: {vuelo.stress}
            </span>
            
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#555' }}>
              Retraso: {vuelo.delay} min | Clima: {vuelo.weather} | Congestión: {vuelo.congestion}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
