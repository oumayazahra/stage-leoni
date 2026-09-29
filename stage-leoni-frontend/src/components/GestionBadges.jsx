import React, { useState, useEffect, useCallback } from 'react';
import { ajouterBadge, supprimerBadge, getBadgesAutorises } from '../services/api';

// ─── Styles inline premium ──────────────────────────────────────────────────
const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px 24px',
    background: 'rgba(59,130,246,0.08)',
    borderRadius: '14px',
    border: '1px solid rgba(59,130,246,0.2)'
  },
  headerIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
  },
  panel: {
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)',
    overflow: 'hidden'
  },
  panelTitle: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    margin: 0, color: '#e2e8f0', fontSize: '15px', fontWeight: '700',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
    border: 'none', borderRadius: '8px', padding: '10px 20px',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(37,99,235,0.35)', transition: 'all 0.2s'
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.08)', color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
    padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
  },
  badgeRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s'
  },
  roleBadgeManager: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.3)', fontWeight: '700'
  },
  roleBadgeSupport: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
    background: 'rgba(16,185,129,0.15)', color: '#34d399',
    border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700'
  },
  tip: { fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' },
  alertBox: {
    padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500'
  }
};

// ─── Composant principal ────────────────────────────────────────────────────
const GestionBadges = ({ salleId, onBadgeChange }) => {
  const [authorizedBadges, setAuthorizedBadges] = useState([]);
  
  // États du formulaire
  const [newBadge, setNewBadge] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('support');
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isLoading, setIsLoading] = useState(false);

  // ── Charger badges ──────────────────────────────────────────────────────
  const loadBadges = useCallback(async () => {
    if (!salleId) return;
    setIsLoading(true);
    try {
      const res = await getBadgesAutorises(salleId);
      setAuthorizedBadges(res.data);
    } catch (err) {
      console.error('Erreur chargement badges:', err);
    } finally {
      setIsLoading(false);
    }
  }, [salleId]);

  useEffect(() => { loadBadges(); }, [loadBadges]);

  // ── Ajouter / Modifier Agent ────────────────────────────────────────────
  const handleAjouter = async (e) => {
    e.preventDefault();
    const cleanBadge = newBadge.trim().toUpperCase();
    if (!cleanBadge) return;
    
    if (cleanBadge.length < 4 || cleanBadge.length > 16) {
      setMessage('Le badge doit contenir entre 4 et 16 caractères.');
      setMessageType('error');
      return;
    }

    try {
      const res = await ajouterBadge(salleId, cleanBadge, email.trim() || null, role);
      if (res.data.success) {
        setMessage(`✅ Les données de l'agent (Badge ${cleanBadge}) ont été enregistrées avec succès.`);
        setMessageType('success');
        
        // Réinitialiser le formulaire
        setNewBadge(''); 
        setEmail(''); 
        setRole('support');
        
        loadBadges();
        if (onBadgeChange) onBadgeChange();
      }
    } catch (err) {
      setMessage("❌ Erreur lors de l'enregistrement des données de l'agent.");
      setMessageType('error');
    }
    setTimeout(() => setMessage(''), 5000);
  };

  // ── Remplir le formulaire avec les données d'un agent existant ────────
  const handleEditAgent = (agent) => {
    setNewBadge(agent.badgeId);
    setEmail(agent.email || '');
    setRole(agent.role || 'support');
  };

  // ── Révoquer accès ──────────────────────────────────────────────────────
  const handleRetirer = async (e, badgeId) => {
    e.stopPropagation();
    if (!window.confirm(`Révoquer les accès et supprimer l'agent ${badgeId} de cette salle ?`)) return;
    try {
      const res = await supprimerBadge(salleId, badgeId);
      if (res.data.success) {
        setMessage(`ℹ️ Accès révoqué pour ${badgeId}.`);
        setMessageType('success');
        loadBadges();
        if (onBadgeChange) onBadgeChange();
      }
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression.');
      setMessageType('error');
    }
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>⚙️</div>
        <div>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '17px', fontWeight: '700' }}>
            Administration · {salleId === 'salle_main' ? 'Salle Main' : 'Salle Backup'}
          </h2>
          <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '13px' }}>
            Gérez les accès des agents (Supports IT) et mettez à jour leurs coordonnées e-mail pour l'envoi automatique des alertes.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Colonne gauche : Liste des agents */}
        <div style={S.panel}>
          <h3 style={S.panelTitle}>👥 Liste des Agents & Contacts</h3>
          
          <div style={{ padding: '12px 20px', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#a78bfa', lineHeight: '1.5' }}>
              💡 Le système enverra automatiquement les alertes critiques (surchauffe, intrusion) aux adresses e-mail configurées ici. 
              <strong> Cliquez sur un agent pour modifier ses données.</strong>
            </p>
          </div>

          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>⏳ Chargement des données...</div>
          ) : authorizedBadges.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              Aucun agent enregistré pour cette salle.
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              {authorizedBadges.map(b => (
                <div 
                  key={b.badgeId} 
                  style={{ ...S.badgeRow, cursor: 'pointer' }}
                  onClick={() => handleEditAgent(b)}
                  title="Cliquez pour modifier"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🔑</span>
                      <strong style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{b.badgeId}</strong>
                      <span style={b.role === 'manager' ? S.roleBadgeManager : S.roleBadgeSupport}>
                        {b.role === 'manager' ? 'Responsable IT' : 'Support IT'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📧</span>
                      <span style={{ color: b.email ? '#94a3b8' : '#475569', fontStyle: b.email ? 'normal' : 'italic' }}>
                        {b.email || 'Aucun e-mail configuré'}
                      </span>
                    </div>
                  </div>

                  <button style={S.btnDanger} onClick={(e) => handleRetirer(e, b.badgeId)} title="Révoquer l'accès de cet agent">
                    Révoquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : Formulaire */}
        <div style={S.panel}>
          <h3 style={S.panelTitle}>📝 Ajouter / Modifier les données d'un Agent</h3>
          <form onSubmit={handleAjouter} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={S.formGroup}>
              <label style={S.label}>ID du Badge RFID</label>
              <input style={S.input} type="text" value={newBadge} onChange={e => setNewBadge(e.target.value)}
                placeholder="Ex: A1B2C3" maxLength={16} required />
              <span style={S.tip}>Saisissez un nouveau badge, ou celui d'un agent existant pour modifier ses données.</span>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Rôle</label>
              <select style={S.select} value={role} onChange={e => setRole(e.target.value)}>
                <option value="support">Support IT (Accès limité)</option>
                <option value="manager">Responsable IT / Manager (Tous les accès)</option>
              </select>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>📧 Adresse E-mail (Destinataire des alertes)</label>
              <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="agent.leoni@gmail.com" />
            </div>

            <button type="submit" style={{ ...S.btnPrimary, marginTop: '8px' }}>
              Sauvegarder les données de l'agent
            </button>

            {message && (
              <div style={{
                ...S.alertBox,
                background: messageType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: messageType === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${messageType === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
              }}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default GestionBadges;