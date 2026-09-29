import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDernierAcces } from '../services/api';
import '../styles/Login.css';

const LoginBadge = ({ onBack }) => {
  const [badgeId, setBadgeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithBadge } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let lastFetchedId = null;
    let lastFetchedDateStr = null;

    // 1. Récupération initiale (baseline)
    const init = async () => {
      try {
        const response = await getDernierAcces();
        if (response.data && isMounted) {
          lastFetchedId = response.data.id;
          lastFetchedDateStr = response.data.date;
          
          // Si le scan a eu lieu dans les 15 dernières secondes, on pré-remplit
          const diffMs = Date.now() - new Date(response.data.date).getTime();
          if (diffMs < 15000) {
            setBadgeId(response.data.badgeId);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du dernier scan", err);
      }
    };

    init();

    // 2. Polling toutes les secondes pour détecter un nouveau scan
    const interval = setInterval(async () => {
      try {
        const response = await getDernierAcces();
        if (!isMounted) return;
        
        if (response.data) {
          // Si un nouveau scan est détecté (id ou date différente)
          if (response.data.id !== lastFetchedId && response.data.date !== lastFetchedDateStr) {
            const newBadgeId = response.data.badgeId;
            const statutAcces = response.data.statut; // 'autorisé' ou 'refusé'
            
            setBadgeId(newBadgeId);
            
            // Mettre à jour les références
            lastFetchedId = response.data.id;
            lastFetchedDateStr = response.data.date;

            // Bloquer la connexion si l'accès physique a été refusé
            if (statutAcces === 'refusé') {
              setError('❌ Accès physique refusé pour ce badge. Connexion annulée.');
              return;
            }

            // Connexion automatique si l'accès physique est autorisé
            setIsLoading(true);
            setError('');
            const success = await loginWithBadge(newBadgeId.trim());
            setIsLoading(false);
            if (!success) {
              setError('❌ Badge non reconnu dans la base de données Web');
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors du polling du dernier badge", err);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loginWithBadge]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!badgeId.trim()) return;
    setIsLoading(true);
    setError('');
    
    // Simuler un léger délai réseau pour l'effet de chargement
    setTimeout(async () => {
      const success = await loginWithBadge(badgeId.trim());
      setIsLoading(false);
      if (!success) {
        setError('❌ Badge non reconnu dans la base de données');
      }
    }, 600);
  };

  const handleSelectBadge = (id) => {
    setBadgeId(id);
  };

  return (
    <div className="login-container">
      <div className="glow-sphere sphere-1"></div>
      <div className="glow-sphere sphere-2"></div>
      
      <div className="login-card">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Retour à l'accueil
          </button>
        )}
        
        <div className="login-icon">🔐</div>
        <h2>Connexion par Badge</h2>
        <p className="login-subtitle">
          Présentez votre badge RFID ou saisissez son identifiant unique.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="badge-input">Identifiant de Badge (RFID ID)</label>
            <input
              id="badge-input"
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              placeholder="Ex: A1B2C3"
              disabled={isLoading}
              required
              autoFocus
              className="badge-input-field"
            />
          </div>
          
          <button type="submit" disabled={isLoading} className="login-submit-btn">
            {isLoading ? 'Vérification...' : "S'authentifier"}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </form>

        <div className="test-badges">
          <p className="test-badges-title">Badges de Test Disponibles (cliquables) :</p>
          <div className="badge-list">
            <button 
              type="button" 
              className="badge-tag-btn manager-tag"
              onClick={() => handleSelectBadge('A1B2C3')}
            >
              <span>A1B2C3</span>
              <span className="badge-role-lbl">Manager</span>
            </button>
            <button 
              type="button" 
              className="badge-tag-btn support-tag"
              onClick={() => handleSelectBadge('D4E5F6')}
            >
              <span>D4E5F6</span>
              <span className="badge-role-lbl">Support Salle Main</span>
            </button>
            <button 
              type="button" 
              className="badge-tag-btn support-tag"
              onClick={() => handleSelectBadge('789XYZ')}
            >
              <span>789XYZ</span>
              <span className="badge-role-lbl">Support Salle Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginBadge;