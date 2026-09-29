import React, { useState, useEffect } from 'react';
import { useCapteurs } from '../hooks/useCapteurs';
import { getEmails } from '../services/api';

const Dashboard = ({ salleId }) => {
  const { temp, hum } = useCapteurs(salleId);
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Charger les alertes récentes
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await getEmails();
        setRecentAlerts(res.data.slice(0, 5));
      } catch (e) {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Valeurs numériques ou replis
  const temperatureVal = temp !== null ? parseFloat(temp) : 0;
  const humiditeVal = hum !== null ? parseFloat(hum) : 0;

  // Calcul du pourcentage pour les jauges SVG (rayon = 50, circonférence = 2 * PI * r = 314.16)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Plage température : 0 à 50°C
  const tempPercent = Math.min(100, Math.max(0, (temperatureVal / 50) * 100));
  const tempOffset = circumference - (tempPercent / 100) * circumference;

  // Plage humidité : 0 à 100%
  const humPercent = Math.min(100, Math.max(0, humiditeVal));
  const humOffset = circumference - (humPercent / 100) * circumference;

  const isTempAlert = temperatureVal > 28;
  const isHumAlert = humiditeVal > 70;
  const isAlert = isTempAlert || isHumAlert;

  return (
    <div className="dashboard-supervision">
      <div className="supervision-header">
        <h2>🌡️ Supervision Environnementale (IoT)</h2>
        <div className="status-indicator">
          <span className={`status-dot ${isAlert ? 'alert-pulse' : 'status-normal-dot'}`}></span>
          <span className="status-text">{isAlert ? 'DÉPASSEMENT CRITIQUE' : 'SYSTÈME NOMINAL'}</span>
        </div>
      </div>

      <div className="sensor-panel">
        {/* Jauge Température */}
        <div className={`sensor-card ${isTempAlert ? 'card-alert' : ''}`}>
          <div className="gauge-container">
            <svg className="gauge-svg" viewBox="0 0 120 120">
              <circle className="gauge-bg" cx="60" cy="60" r={radius} />
              <circle 
                className={`gauge-bar ${isTempAlert ? 'bar-alert-temp' : 'bar-normal-temp'}`}
                cx="60" 
                cy="60" 
                r={radius} 
                strokeDasharray={circumference}
                strokeDashoffset={tempOffset}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="gauge-content">
              <span className="gauge-icon">🌡️</span>
              <span className="sensor-value">{temp !== null ? `${temperatureVal.toFixed(1)}` : '--'}</span>
              <span className="sensor-unit">°C</span>
            </div>
          </div>
          <div className="sensor-label">Température</div>
          <div className="sensor-status-lbl">
            {isTempAlert ? '⚠️ Limite (>28°C) dépassée' : 'Température Normale'}
          </div>
        </div>

        {/* Jauge Humidité */}
        <div className={`sensor-card ${isHumAlert ? 'card-alert' : ''}`}>
          <div className="gauge-container">
            <svg className="gauge-svg" viewBox="0 0 120 120">
              <circle className="gauge-bg" cx="60" cy="60" r={radius} />
              <circle 
                className={`gauge-bar ${isHumAlert ? 'bar-alert-hum' : 'bar-normal-hum'}`}
                cx="60" 
                cy="60" 
                r={radius} 
                strokeDasharray={circumference}
                strokeDashoffset={humOffset}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="gauge-content">
              <span className="gauge-icon">💧</span>
              <span className="sensor-value">{hum !== null ? `${Math.round(humiditeVal)}` : '--'}</span>
              <span className="sensor-unit">%</span>
            </div>
          </div>
          <div className="sensor-label">Humidité</div>
          <div className="sensor-status-lbl">
            {isHumAlert ? '⚠️ Seuil (>70%) dépassé' : 'Humidité Nominale'}
          </div>
        </div>
      </div>

      {isAlert && (
        <div className="alert-banner">
          <span className="alert-icon">⚠️</span>
          <span>
            <strong>Alerte Environnementale :</strong> 
            {isTempAlert && ' La température dépasse le seuil critique de 28°C.'}
            {isHumAlert && ' L\'humidité dépasse le seuil de tolérance de 70%.'}
            Veuillez vérifier les climatiseurs de la salle.
          </span>
        </div>
      )}

      {/* Widget compact : Journal d'activité récent */}
      <div style={{
        marginTop: '20px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '14px' }}>
            📜 Journal des Alertes Récentes
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Mise à jour automatique</span>
        </div>
        {recentAlerts.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            🛡️ Aucune alerte système récente. Tous les paramètres sont nominaux.
          </div>
        ) : (
          <div>
            {recentAlerts.map((alert) => (
              <div key={alert.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                opacity: alert.read ? 0.65 : 1
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                  {alert.subject?.includes('Surchauffe') || alert.subject?.includes('Température') ? '🌡️' :
                   alert.subject?.includes('Humidité') ? '💧' :
                   alert.subject?.includes('IA') || alert.subject?.includes('Assistant') ? '🤖' : '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: alert.read ? '500' : '700',
                    color: alert.read ? '#94a3b8' : '#f1f5f9',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {alert.subject}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {new Date(alert.date).toLocaleString('fr-FR')}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0,
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  background: alert.realSent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  color: alert.realSent ? '#34d399' : '#64748b',
                  border: `1px solid ${alert.realSent ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`
                }}>
                  {alert.realSent ? '✅ Envoyé' : '📁 Local'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;