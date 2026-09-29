import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import LoginBadge from './components/LoginBadge';
import SiteSelector from './components/SiteSelector';
import Dashboard from './components/Dashboard';
import Historique from './components/Historique';
import GestionBadges from './components/GestionBadges';
import Chatbot from './components/Chatbot';
import FormationRecrues from './components/FormationRecrues';
import AnalysesMesures from './components/AnalysesMesures';
import { getHistorique, getSallesParSite } from './services/api';
import leoniLogo from './assets/leoni-logo.png';
import './styles/App.css';

// ─────────────────────────────────────────────────────
// AppContent : Tableau de bord principal (après sélection du site)
// ─────────────────────────────────────────────────────
function AppContent({ sallesDisponibles, siteActif, onRetourSites }) {
  const { user, logout } = useAuth();

  // Salle active : pour le support → sa salle assignée ; pour le manager → première salle du site
  const salleInitiale = user?.role === 'support'
    ? user.salleAttribuee
    : (sallesDisponibles[0]?.id || null);

  const [salleActive, setSalleActive] = useState(salleInitiale);
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [showGestionBadges, setShowGestionBadges] = useState(false);
  const [showFormation, setShowFormation] = useState(false);
  const [showAnalyses, setShowAnalyses] = useState(false);

  // Synchroniser la salle active si l'utilisateur change
  useEffect(() => {
    if (user) {
      setSalleActive(
        user.role === 'support' ? user.salleAttribuee : (sallesDisponibles[0]?.id || null)
      );
    }
  }, [user, sallesDisponibles]);

  // Charger l'historique de la salle active
  const refreshHistorique = async () => {
    if (salleActive && user?.role === 'manager') {
      try {
        const res = await getHistorique(salleActive);
        setHistorique(res.data);
      } catch (err) {
        console.error('Erreur chargement historique:', err);
      }
    }
  };

  useEffect(() => {
    if (user) refreshHistorique();
  }, [salleActive, user]);

  const fermerPanneaux = () => {
    setShowGestionBadges(false);
    setShowHistorique(false);
    setShowFormation(false);
    setShowAnalyses(false);
  };

  return (
    <div className="app-container">
      {/* ── En-tête ── */}
      <header className="app-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={leoniLogo}
            alt="LEONI Logo"
            style={{ height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />
          <span className="navbar-brand-divider" style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '1.25rem' }}>|</span>
          <div className="header-title-text">
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Control Center</h1>
            <span className="header-subtitle">Supervision Salles Serveur</span>
          </div>

          {/* Badge du site actif (Manager seulement) */}
          {user?.role === 'manager' && siteActif && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '20px', padding: '4px 12px 4px 8px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onClick={onRetourSites}
              title="Revenir à la carte des sites"
            >
              <span style={{ fontSize: '0.65rem' }}>◀</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em' }}>
                {siteActif.id} — {siteActif.nom.split(' ')[1] || siteActif.nom}
              </span>
            </div>
          )}
        </div>

        <div className="header-actions">
          {/* Info Utilisateur */}
          <div className="user-profile-badge">
            <span className="user-avatar">👤</span>
            <div className="user-details">
              <span className="user-role-label">{user?.role === 'manager' ? 'Responsable IT' : 'Support IT'}</span>
              <span className="user-badge-id">ID: {user?.badgeId}</span>
            </div>
          </div>

          {/* Sélecteur de salle */}
          {user?.role === 'manager' ? (
            <div className="salle-selector-wrapper">
              <label htmlFor="salle-select">Salle active :</label>
              <select
                id="salle-select"
                value={salleActive}
                onChange={(e) => setSalleActive(e.target.value)}
                className="salle-select"
              >
                {sallesDisponibles.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="salle-info-badge">
              <span className="salle-info-icon">🗄️</span>
              <span>{sallesDisponibles.find(s => s.id === salleActive)?.nom || 'Salle Attribuée'}</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="header-btn-group">
            {/* Formation accessible à tous */}
            <button
              className={`icon-btn ${showFormation ? 'btn-active' : ''}`}
              onClick={() => { fermerPanneaux(); setShowFormation(!showFormation); }}
            >
              🎓 Formation Recrues
            </button>

            {/* Analyses & Graphiques */}
            <button
              className={`icon-btn ${showAnalyses ? 'btn-active' : ''}`}
              onClick={() => { fermerPanneaux(); setShowAnalyses(!showAnalyses); }}
            >
              📈 Analyses &amp; Graphiques
            </button>

            {user?.role === 'manager' && (
              <button
                className={`icon-btn ${showGestionBadges ? 'btn-active' : ''}`}
                onClick={() => { fermerPanneaux(); setShowGestionBadges(!showGestionBadges); }}
              >
                ⚙️ Gérer les badges
              </button>
            )}

            <button
              className={`icon-btn ${showHistorique ? 'btn-active' : ''}`}
              onClick={() => { fermerPanneaux(); setShowHistorique(!showHistorique); }}
            >
              📋 Journal d'accès
            </button>

            <button className="logout-btn" onClick={logout} title="Déconnexion">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenu principal ── */}
      <main className="dashboard-main-content">
        <div className="grid-supervision-section">
          <Dashboard salleId={salleActive} />
        </div>

        {(showGestionBadges && user?.role === 'manager') && (
          <section className="grid-admin-section fade-in">
            <GestionBadges salleId={salleActive} onBadgeChange={refreshHistorique} />
          </section>
        )}

        {showHistorique && (
          <section className="grid-admin-section fade-in">
            <Historique historique={historique} />
          </section>
        )}

        {showFormation && (
          <section className="grid-admin-section fade-in">
            <FormationRecrues />
          </section>
        )}

        {showAnalyses && (
          <section className="grid-admin-section fade-in">
            <AnalysesMesures salleId={salleActive} />
          </section>
        )}
      </main>

      {/* Chatbot flottant */}
      <Chatbot salleId={salleActive} />
    </div>
  );
}

// ─────────────────────────────────────────────────────
// App : Routeur principal (LandingPage → Login → SiteSelector/Dashboard)
// ─────────────────────────────────────────────────────
function App() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // État multi-sites (Manager)
  const [siteActif, setSiteActif] = useState(null);
  const [sallesDuSite, setSallesDuSite] = useState([]);

  // État support : charger la salle de l'utilisateur au login
  const [sallesSupportChargees, setSallesSupportChargees] = useState(false);
  const [sallesSupport, setSallesSupport] = useState([]);

  // Quand l'utilisateur se connecte, adapter le flux selon son rôle
  useEffect(() => {
    if (!user) {
      // Réinitialiser à la déconnexion
      setSiteActif(null);
      setSallesDuSite([]);
      setSallesSupportChargees(false);
      setSallesSupport([]);
      return;
    }

    if (user.role === 'support' && user.salleAttribuee) {
      // Support : construire directement la liste de salles (sa salle uniquement)
      setSallesSupport([{ id: user.salleAttribuee, nom: user.salleAttribuee }]);
      setSallesSupportChargees(true);
    }
  }, [user]);

  // ── Pas connecté ──
  if (!user) {
    if (showLogin) return <LoginBadge onBack={() => setShowLogin(false)} />;
    return <LandingPage onGoToLogin={() => setShowLogin(true)} />;
  }

  // ── Support IT ── → accès direct à sa salle (pas de SiteSelector)
  if (user.role === 'support') {
    if (!sallesSupportChargees) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Chargement...
        </div>
      );
    }
    return (
      <AppContent
        sallesDisponibles={sallesSupport}
        siteActif={null}
        onRetourSites={() => {}}
      />
    );
  }

  // ── Manager ── → SiteSelector d'abord, puis Dashboard du site choisi
  if (user.role === 'manager') {
    // Si aucun site sélectionné → afficher la Carte des Sites
    if (!siteActif) {
      return (
        <SiteSelector
          onSiteSelected={(site, salles) => {
            setSiteActif(site);
            setSallesDuSite(salles);
          }}
        />
      );
    }

    // Site sélectionné → afficher le Dashboard avec les salles de ce site
    return (
      <AppContent
        sallesDisponibles={sallesDuSite}
        siteActif={siteActif}
        onRetourSites={() => {
          setSiteActif(null);
          setSallesDuSite([]);
        }}
      />
    );
  }

  return null;
}

export default App;