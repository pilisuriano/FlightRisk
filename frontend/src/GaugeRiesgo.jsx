// Medidor semicircular de riesgo operacional (SVG puro, sin dependencias).
// Recibe `nivel` ("Low" | "Medium" | "High") y anima la aguja hacia el arco correspondiente.

const COLORES = {
  Low:    '#16a34a',
  Medium: '#d97706',
  High:   '#dc2626',
};

const ETIQUETAS = {
  Low:    'Bajo',
  Medium: 'Medio',
  High:   'Alto',
};

// Ángulo de la aguja en grados (0° = izquierda, 180° = derecha, sobre semicírculo).
const ANGULOS = {
  Low:    30,
  Medium: 90,
  High:   150,
};

// Calcula un punto (x, y) sobre el arco del semicírculo dado un ángulo en grados.
function punto(cx, cy, r, grados) {
  const rad = (grados - 180) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// Arco SVG de startDeg a endDeg (ambos en grados, sentido anti-horario desde izquierda).
function arco(cx, cy, r, startDeg, endDeg) {
  const [sx, sy] = punto(cx, cy, r, startDeg);
  const [ex, ey] = punto(cx, cy, r, endDeg);
  return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
}

export default function GaugeRiesgo({ nivel }) {
  const cx = 100, cy = 90, r = 72;
  const color = COLORES[nivel] || '#94a3b8';
  const etiqueta = ETIQUETAS[nivel] || nivel;
  const angulo = ANGULOS[nivel] ?? 90;

  // Punta de la aguja
  const [nx, ny] = punto(cx, cy, r - 12, angulo);
  // Cola de la aguja
  const [tx, ty] = punto(cx, cy, 18, angulo + 180);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 200 100" width="200" height="100" aria-label={`Riesgo ${etiqueta}`}>
        {/* Fondo gris del arco completo */}
        <path
          d={arco(cx, cy, r, 0, 180)}
          fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"
        />

        {/* Arco LOW (0°–60°) */}
        <path
          d={arco(cx, cy, r, 0, 60)}
          fill="none" stroke="#16a34a" strokeWidth="14" strokeLinecap="round" opacity=".85"
        />
        {/* Arco MEDIUM (60°–120°) */}
        <path
          d={arco(cx, cy, r, 60, 120)}
          fill="none" stroke="#d97706" strokeWidth="14" strokeOpacity=".85"
        />
        {/* Arco HIGH (120°–180°) */}
        <path
          d={arco(cx, cy, r, 120, 180)}
          fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round" opacity=".85"
        />

        {/* Aguja */}
        <line
          x1={tx} y1={ty} x2={nx} y2={ny}
          stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ transition: 'all .5s cubic-bezier(.4,0,.2,1)' }}
        />
        {/* Centro de la aguja */}
        <circle cx={cx} cy={cy} r="6" fill={color} />
        <circle cx={cx} cy={cy} r="3" fill="white" />

        {/* Etiquetas de los extremos */}
        <text x="12" y="98" fontSize="9" fill="#16a34a" fontWeight="600">Bajo</text>
        <text x="84" y="18" fontSize="9" fill="#d97706" fontWeight="600" textAnchor="middle">Medio</text>
        <text x="175" y="98" fontSize="9" fill="#dc2626" fontWeight="600" textAnchor="end">Alto</text>
      </svg>

      {/* Etiqueta del nivel */}
      <div style={{
        marginTop: 4,
        fontSize: 18,
        fontWeight: 700,
        color,
        letterSpacing: '.01em',
      }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
        Riesgo Operacional
      </div>
    </div>
  );
}
