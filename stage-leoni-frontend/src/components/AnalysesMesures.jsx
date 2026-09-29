import React, { useState, useEffect, useCallback } from 'react';
import { getCapteursHistorique } from '../services/api';

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    background: 'rgba(99, 102, 241, 0.08)',
    borderRadius: '14px',
    border: '1px solid rgba(99, 102, 241, 0.2)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  headerIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  select: {
    background: 'rgba(15,23,42,0.8)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  statsCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.07)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statsTitle: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statsValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f1f5f9'
  },
  statsFooter: {
    fontSize: '11px',
    color: '#64748b'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  chartPanel: {
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.07)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0
  },
  svgWrapper: {
    width: '100%',
    height: '240px',
    background: 'rgba(10, 15, 30, 0.4)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
    position: 'relative'
  }
};

const AnalysesMesures = ({ salleId }) => {
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les données de l'API
  const fetchData = useCallback(async () => {
    try {
      const res = await getCapteursHistorique(salleId, limit);
      setData(res.data);
    } catch (e) {
      console.error("Erreur de récupération de l'historique :", e);
    } finally {
      setLoading(false);
    }
  }, [salleId, limit]);

  useEffect(() => {
    fetchData();
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculs statistiques
  const getStats = (key) => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = data.map(d => d[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return { min, max, avg };
  };

  const tempStats = getStats('temperature');
  const humStats = getStats('humidite');

  // Générateur de courbes SVG
  const generateSvgChart = (key, colorTheme) => {
    if (data.length < 2) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
          Génération de l'historique en cours...
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const values = data.map(d => d[key]);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    // Ajuster l'échelle pour éviter un graphique écrasé
    if (maxVal === minVal) {
      minVal -= 2;
      maxVal += 2;
    } else {
      const margin = (maxVal - minVal) * 0.15;
      minVal = Math.max(0, minVal - margin);
      maxVal = maxVal + margin;
    }

    // Calculer les points
    const points = data.map((d, index) => {
      const x = padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
      const y = (height - padding.bottom) - ((d[key] - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom);
      return { x, y, val: d[key], date: new Date(d.date) };
    });

    // Construire le chemin de la ligne
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Construire le chemin pour la zone sous la courbe
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - padding.bottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - padding.bottom).toFixed(1)} Z`;

    // Thèmes couleur
    const strokeColor = colorTheme === 'temp' ? '#f97316' : '#3b82f6';
    const gradientId = `area-grad-${key}`;
    const stopColorStart = colorTheme === 'temp' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(59, 130, 246, 0.4)';
    const stopColorEnd = colorTheme === 'temp' ? 'rgba(249, 115, 22, 0)' : 'rgba(59, 130, 246, 0)';

    // Grille horizontale (3 lignes)
    const gridLines = [0, 0.5, 1].map((ratio) => {
      const val = maxVal - ratio * (maxVal - minVal);
      const y = padding.top + ratio * (height - padding.top - padding.bottom);
      return { val, y };
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stopColorStart} />
            <stop offset="100%" stopColor={stopColorEnd} />
          </linearGradient>
        </defs>

        {/* Lignes de repère horizontales */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line 
              x1={padding.left} 
              y1={line.y} 
              x2={width - padding.right} 
              y2={line.y} 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeDasharray="4 4"
            />
            <text 
              x={padding.left - 8} 
              y={line.y + 4} 
              fill="#64748b" 
              fontSize="10" 
              textAnchor="end"
              fontFamily="monospace"
            >
              {key === 'temperature' ? `${line.val.toFixed(1)}°C` : `${Math.round(line.val)}%`}
            </text>
          </g>
        ))}

        {/* Remplissage de la zone */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Ligne principale */}
        <path 
          d={linePath} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Cercles de points importants */}
        {points.map((p, idx) => {
          // Afficher les points sur la courbe (tous les points si peu nombreux, sinon 1 sur 2)
          const step = Math.max(1, Math.round(points.length / 15));
          if (idx % step !== 0 && idx !== points.length - 1) return null;

          return (
            <g key={idx}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4.5" 
                fill="#0f172a" 
                stroke={strokeColor} 
                strokeWidth="2" 
              />
              {/* Tooltip text au survol ou visible sur le dernier point */}
              {idx === points.length - 1 && (
                <g>
                  <rect 
                    x={p.x - 40} 
                    y={p.y - 28} 
                    width="50" 
                    height="18" 
                    rx="4" 
                    fill="rgba(15, 23, 42, 0.9)" 
                    stroke={strokeColor} 
                    strokeWidth="1" 
                  />
                  <text 
                    x={p.x - 15} 
                    y={p.y - 16} 
                    fill="#f1f5f9" 
                    fontSize="9.5" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    {key === 'temperature' ? `${p.val.toFixed(1)}°` : `${Math.round(p.val)}%`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Axe X (Temps) */}
        <text 
          x={padding.left} 
          y={height - 8} 
          fill="#64748b" 
          fontSize="9.5"
        >
          {points[0].date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </text>
        <text 
          x={width - padding.right} 
          y={height - 8} 
          fill="#64748b" 
          fontSize="9.5" 
          textAnchor="end"
        >
          En direct ({points[points.length - 1].date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
        </text>
      </svg>
    );
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerIcon}>📈</div>
          <div>
            <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '17px', fontWeight: '700' }}>
              Analyses & Graphiques · {salleId === 'salle_main' ? 'Salle Main' : 'Salle Backup'}
            </h2>
            <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Historique des relevés thermiques et hydriques collectés par les capteurs connectés (DHT22).
            </p>
          </div>
        </div>

        <div style={S.controlGroup}>
          <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Échantillon :</label>
          <select 
            style={S.select} 
            value={limit} 
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setLoading(true);
            }}
          >
            <option value={10}>10 dernières mesures</option>
            <option value={20}>20 dernières mesures</option>
            <option value={50}>50 dernières mesures</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Chargement de l'historique...</div>
      ) : (
        <>
          {/* Section statistiques */}
          <div style={S.statsGrid}>
            <div style={{ ...S.statsCard, borderLeft: '4px solid #f97316' }}>
              <span style={S.statsTitle}>🌡️ Température Moyenne</span>
              <span style={S.statsValue}>{tempStats.avg.toFixed(1)} °C</span>
              <div style={S.statsFooter}>
                Min : <strong style={{ color: '#fdba74' }}>{tempStats.min.toFixed(1)}°C</strong> | 
                Max : <strong style={{ color: '#f97316' }}>{tempStats.max.toFixed(1)}°C</strong>
              </div>
            </div>

            <div style={{ ...S.statsCard, borderLeft: '4px solid #3b82f6' }}>
              <span style={S.statsTitle}>💧 Humidité Moyenne</span>
              <span style={S.statsValue}>{Math.round(humStats.avg)} %</span>
              <div style={S.statsFooter}>
                Min : <strong style={{ color: '#93c5fd' }}>{Math.round(humStats.min)}%</strong> | 
                Max : <strong style={{ color: '#3b82f6' }}>{Math.round(humStats.max)}%</strong>
              </div>
            </div>
          </div>

          {/* Section Graphiques */}
          <div style={S.chartsGrid}>
            {/* Température */}
            <div style={S.chartPanel}>
              <h3 style={S.chartTitle}>
                <span style={{ color: '#f97316' }}>🍊</span> Courbe de Température
              </h3>
              <div style={S.svgWrapper}>
                {generateSvgChart('temperature', 'temp')}
              </div>
            </div>

            {/* Humidité */}
            <div style={S.chartPanel}>
              <h3 style={S.chartTitle}>
                <span style={{ color: '#3b82f6' }}>💧</span> Courbe d'Humidité
              </h3>
              <div style={S.svgWrapper}>
                {generateSvgChart('humidite', 'hum')}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysesMesures;
