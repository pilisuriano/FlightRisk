import React, { useState } from 'react';

export default function BuscadorVuelos() {
  // 1. Estados para los datos del usuario (Variables Oficiales)
  const [formData, setFormData] = useState({
    origin_airport: 'EZE',
    destination_airport: 'MAD',
    avg_delay_minutes: 0,
    cancellation_rate: 0.0,
    connection_time: 0,
    airport_congestion: 0.5,
    weather_risk: 0.5,
    sentiment_score: 0.5,
    baggage_complaints: 0,
    departure_hour: 12
  });

  // 2. Estados para manejar las respuestas del Backend
  const [stressLevel, setStressLevel] = useState(null);
  const [alternativas, setAlternativas] = useState([]);
  const [loading, setLoading] = useState(false);

  // 3. Función para evaluar el riesgo del vuelo consultado
  const evaluarVuelo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStressLevel(null);
    setAlternativas([]);

    try {
      const response = await fetch('/api/evaluar_vuelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setStressLevel(data.stress_level);
    } catch (error) {
      console.error("Error al evaluar el vuelo:", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. Función para buscar alternativas si el vuelo es riesgoso
  const buscarAlternativas = async () => {
    try {
      const url = `/api/recomendaciones?origen=${formData.origin_airport}&destino=${formData.destination_airport}`;
      const response = await fetch(url);
      const data = await response.json();
      setAlternativas(data);
    } catch (error) {
      console.error("Error al buscar alternativas:", error);
    }
  };

  // Manejador de cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'origin_airport' || name === 'destination_airport' ? value : Number(value)
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Buscador de Vuelos - FlightRisk</h1>
      
      {/* Formulario de Simulación (En la app final, muchos de estos datos vendrán del scraper) */}
      <form onSubmit={evaluarVuelo} style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
        <label>
          Origen: <input name="origin_airport" value={formData.origin_airport} onChange={handleChange} />
        </label>
        <label>
          Destino: <input name="destination_airport" value={formData.destination_airport} onChange={handleChange} />
        </label>
        <label>
          Demora Promedio (min): <input type="number" name="avg_delay_minutes" value={formData.avg_delay_minutes} onChange={handleChange} />
        </label>
        <label>
          Tasa de Cancelación (0-1): <input type="number" step="0.01" name="cancellation_rate" value={formData.cancellation_rate} onChange={handleChange} />
        </label>
        <label>
          Riesgo Climático (0-1): <input type="number" step="0.01" name="weather_risk" value={formData.weather_risk} onChange={handleChange} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Calculando Riesgo...' : 'Evaluar Vuelo'}
        </button>
      </form>

      <hr style={{ margin: '30px 0' }} />

      {/* RENDERIZADO CONDICIONAL DEL RESULTADO Y EL BOTÓN */}
      {stressLevel && (
        <div style={{ padding: '20px', border: '2px solid #ccc', borderRadius: '8px' }}>
          <h2>Nivel de Estrés Predicho: 
            <span style={{ 
              color: stressLevel === 'Low' ? 'green' : stressLevel === 'Medium' ? 'orange' : 'red',
              marginLeft: '10px'
            }}>
              {stressLevel === 'Low' ? '🟢 Bajo' : stressLevel === 'Medium' ? '🟡 Medio' : '🔴 Alto'}
            </span>
          </h2>

          {/* Lógica del Botón: Solo aparece si NO es Low */}
          {stressLevel !== 'Low' && (
            <div style={{ marginTop: '20px' }}>
              <p>Este vuelo tiene riesgos operativos potenciales.</p>
              <button 
                onClick={buscarAlternativas}
                style={{ backgroundColor: '#ff4d4d', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Ver alternativas con menor estrés
              </button>
            </div>
          )}
        </div>
      )}

      {/* RENDERIZADO DE LAS RECOMENDACIONES SEGURAS */}
      {alternativas.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Alternativas Recomendadas (Riesgo Bajo):</h3>
          <ul>
            {alternativas.map((alt, index) => (
              <li key={index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e6ffe6', border: '1px solid green' }}>
                <strong>{alt.airline}</strong> | Sale: {alt.departure_hour}:00 | Demora histórica: {alt.avg_delay_minutes} min
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}