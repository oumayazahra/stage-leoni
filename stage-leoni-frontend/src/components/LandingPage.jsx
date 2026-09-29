import React from 'react';
import '../styles/LandingPage.css';
import leoniLogo from '../assets/leoni-logo.png';
import leoniBgHd from '../assets/leoni-bg-hd.png';

const LandingPage = ({ onGoToLogin }) => {
  return (
    <div
      className="landing-container"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 26, 60, 0.65), rgba(0, 26, 60, 0.75)), url(${leoniBgHd})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Barre de navigation supérieure */}
      <nav className="landing-navbar">
        <div className="navbar-brand">
          {/* Logo LEONI officiel inséré ici à la place du texte générique */}
          <img
            src={leoniLogo}
            alt="LEONI Logo"
            style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />
          <span className="navbar-brand-divider" style={{ marginLeft: '10px' }}>|</span>
          <span className="navbar-brand-sub">Server Room IoT</span>
        </div>
        <div className="navbar-badge">
          <span className="navbar-dot"></span>
          <span>Système Opérationnel</span>
        </div>
      </nav>

      {/* Section Héros */}
      <header className="hero-section">
        <div className="hero-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' }}>
          <h1 style={{ textAlign: 'center' }}>
            Plateforme de Supervision <br />
            <span className="text-gradient">Salle Serveur</span>
          </h1>
          <p className="hero-subtitle" style={{ textAlign: 'center', margin: '0 auto 36px auto' }}>
            Système sécurisé de contrôle d'accès RFID et de télémétrie environnementale en temps réel — développé pour LEONI Wiring Systems.
          </p>
          <button className="cta-button" onClick={onGoToLogin}>
            <span>Accéder au Panneau</span>
            <span className="arrow">→</span>
          </button>
        </div>
      </header>

      {/* Section Fonctionnalités */}
      <section className="features-section">
        <h2 className="section-title">Technologie & Supervision</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">🔐</div>
            <h3>Contrôle d'accès autonome</h3>
            <p>Vérification instantanée via carte microcontrôleur ESP32 et lecteur RFID RC522. Zéro saisie manuelle requise.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">🌡️</div>
            <h3>Supervision Temps Réel</h3>
            <p>Lecture en direct des capteurs DHT22. Seuils d'alerte configurés à 28°C (température) et 70% (humidité).</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">🎙️</div>
            <h3>Assistant Vocal & Chat</h3>
            <p>Posez vos questions à notre assistant intelligent. Écoute vocale et synthèse de parole intégrées en français.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">👥</div>
            <h3>Gestion Multi-Rôles</h3>
            <p>Accès restreint selon le rôle. Dashboard complet pour le Manager, supervision dédiée pour le Support IT.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">📁</div>
            <h3>Fichier Log Persistant</h3>
            <p>Historisation complète et sécurisée de chaque tentative d'entrée avec filtre par salle et statut d'accès.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-glow"></div>
            <div className="feature-icon">⚡</div>
            <h3>Prêt pour l'IoT</h3>
            <p>Architecture REST robuste conçue pour connecter directement vos capteurs physiques et actionneurs de porte.</p>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="landing-footer">
        <div className="footer-line"></div>
        <p>© 2026 · LEONI Wiring Systems · Stage de fin d'études</p>
      </footer>
    </div>
  );
};

export default LandingPage;