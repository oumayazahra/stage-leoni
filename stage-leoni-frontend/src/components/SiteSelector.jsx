import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSites, getSallesParSite } from '../services/api';
import leoniLogo from '../assets/leoni-logo.png';
import '../styles/SiteSelector.css';

// Icônes et couleurs par code de site
const SITE_CONFIG = {
  TNS: { icon: '🏭', className: 'tns' },
  LTN: { icon: '🏢', className: 'ltn' },
  TNM: { icon: '🏗️', className: 'tnm' },
  TN4: { icon: '🌐', className: 'tn4' },
};

export default function SiteSelector({ onSiteSelected }) {
  const { user, logout } = useAuth();
  const [sites, setSites] = useState([]);
  const [salleCounts, setSalleCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const chargerSites = async () => {
      try {
        setLoading(true);
        const res = await getSites();
        const sitesData = res.data;
        setSites(sitesData);

        // Charger le nombre de salles pour chaque site en parallèle
        const counts = {};
        await Promise.all(
          sitesData.map(async (site) => {
            try {
              const r = await getSallesParSite(site.id);
              counts[site.id] = r.data.salles.length;
            } catch {
              counts[site.id] = 0;
            }
          })
        );
        setSalleCounts(counts);
      } catch (err) {
        console.error('Erreur chargement des sites:', err);
        setError('Impossible de charger les sites. Vérifiez la connexion au serveur.');
      } finally {
        setLoading(false);
      }
    };

    chargerSites();
  }, []);

  const handleSiteClick = async (site) => {
    try {
      const res = await getSallesParSite(site.id);
      onSiteSelected(site, res.data.salles);
    } catch (err) {
      console.error('Erreur chargement salles du site:', err);
    }
  };

  return (
    <div className="site-selector-page">
      {/* ── Header ── */}
      <header className="site-selector-header">
        <div className="site-selector-brand">
          <img src={leoniLogo} alt="LEONI Logo" />
          <span className="site-selector-divider">|</span>
          <div className="site-selector-brand-text">
            <h1>Control Center</h1>
            <span>Supervision Multi-Sites</span>
          </div>
        </div>

        <div className="site-selector-user-info">
          <div className="site-user-badge">
            <div className="site-user-avatar">👤</div>
            <div className="site-user-details">
              <span className="site-user-role">Responsable IT</span>
              <span className="site-user-id">ID: {user?.badgeId}</span>
            </div>
          </div>
          <button className="site-logout-btn" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="site-selector-hero">
        <div className="hero-eyebrow">
          <span>🗺️</span>
          <span>Tableau de bord global</span>
        </div>
        <h2>
          Choisissez un <span>Site</span>
        </h2>
        <p>
          Sélectionnez un site industriel pour accéder à la supervision
          des salles serveurs et aux contrôles d'accès.
        </p>
      </div>

      {/* ── Grille des sites ── */}
      {loading ? (
        <div className="sites-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="site-card-skeleton">
              <div className="skeleton-line" style={{ width: '50px', height: '50px', borderRadius: '12px', marginBottom: '20px' }} />
              <div className="skeleton-line" style={{ width: '40%', height: '12px' }} />
              <div className="skeleton-line" style={{ width: '70%', height: '20px' }} />
              <div className="skeleton-line" style={{ width: '55%', height: '12px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px', background: 'rgba(239,68,68,0.08)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', maxWidth: '480px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Erreur de connexion</div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>{error}</div>
        </div>
      ) : (
        <div className="sites-grid">
          {sites.map((site) => {
            const config = SITE_CONFIG[site.id] || { icon: '🏢', className: 'tns' };
            const nbSalles = salleCounts[site.id] ?? '…';

            return (
              <div
                key={site.id}
                className={`site-card ${config.className}`}
                onClick={() => handleSiteClick(site)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSiteClick(site)}
                aria-label={`Accéder au site ${site.nom}`}
              >
                {/* Flèche */}
                <div className="site-card-arrow">→</div>

                {/* Icône */}
                <div className="site-card-icon-wrapper">{config.icon}</div>

                {/* Contenu */}
                <div className="site-card-content">
                  <div className="site-card-code">{site.id}</div>
                  <h3 className="site-card-name">{site.nom}</h3>
                  <div className="site-card-location">
                    <span>📍</span>
                    <span>{site.localisation}</span>
                  </div>

                  {/* Stats */}
                  <div className="site-card-stats">
                    <div className="site-stat-chip">
                      <span>🗄️</span>
                      <strong>{nbSalles}</strong> salle{nbSalles !== 1 ? 's' : ''} serveur
                    </div>
                    <div className="site-stat-chip">
                      <span style={{ color: '#4ade80', fontSize: '0.6rem' }}>●</span>
                      Actif
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="site-selector-footer">
        LEONI Wiring Systems — Système de Contrôle d'Accès Centralisé © 2026
      </div>
    </div>
  );
}
