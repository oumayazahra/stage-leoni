import React, { useState, useEffect } from 'react';
import { getEmails, markEmailAsRead, deleteEmail } from '../services/api';
import '../styles/AlertesInbox.css';

const AlertesInbox = ({ onUpdateCount }) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les e-mails
  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const res = await getEmails();
      setEmails(res.data);
      if (res.data.length > 0 && !selectedEmail) {
        setSelectedEmail(res.data[0]);
      }
      
      // Mettre à jour le compteur global d'alertes non lues
      const unreadCount = res.data.filter(e => !e.read).length;
      if (onUpdateCount) {
        onUpdateCount(unreadCount);
      }
    } catch (err) {
      console.error('Erreur chargement emails alertes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    if (!email.read) {
      try {
        await markEmailAsRead(email.id);
        // Mettre à jour l'état local
        const updated = emails.map(e => e.id === email.id ? { ...e, read: true } : e);
        setEmails(updated);
        setSelectedEmail({ ...email, read: true });
        
        // Mettre à jour le compteur d'alertes non lues
        const unreadCount = updated.filter(e => !e.read).length;
        if (onUpdateCount) {
          onUpdateCount(unreadCount);
        }
      } catch (err) {
        console.error('Erreur marquage lu:', err);
      }
    }
  };

  const handleDeleteEmail = async (e, id) => {
    e.stopPropagation(); // Éviter de sélectionner
    try {
      await deleteEmail(id);
      const filtered = emails.filter(email => email.id !== id);
      setEmails(filtered);
      
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(filtered.length > 0 ? filtered[0] : null);
      }
      
      // Mettre à jour le compteur
      const unreadCount = filtered.filter(em => !em.read).length;
      if (onUpdateCount) {
        onUpdateCount(unreadCount);
      }
    } catch (err) {
      console.error('Erreur suppression email:', err);
    }
  };

  const formatEmailDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="inbox-card">
      <div className="inbox-header">
        <div className="inbox-title-group">
          <span className="inbox-icon-bell">📬</span>
          <div>
            <h3>Centre d'Alertes Système (Boîte de Réception)</h3>
            <p>E-mails critiques envoyés par l'IA et les capteurs d'ambiance</p>
          </div>
        </div>
        <button className="inbox-refresh-btn" onClick={loadEmails} title="Actualiser la boîte">
          🔄 Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="inbox-loading">
          <span className="spinner">⏳</span>
          <p>Chargement des alertes système...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="inbox-empty-state">
          <span className="shield-icon">🛡️</span>
          <h4>Aucune alerte active</h4>
          <p>Toutes les mesures sont normales et aucun incident de sécurité n'a été enregistré.</p>
        </div>
      ) : (
        <div className="inbox-layout">
          {/* Liste des emails (Sidebar) */}
          <div className="inbox-sidebar-list">
            {emails.map(email => (
              <div 
                key={email.id} 
                className={`inbox-item ${!email.read ? 'unread' : ''} ${selectedEmail && selectedEmail.id === email.id ? 'active' : ''}`}
                onClick={() => handleSelectEmail(email)}
              >
                <div className="inbox-item-meta">
                  <span className="inbox-item-indicator"></span>
                  <span className="inbox-item-date">{formatEmailDate(email.date)}</span>
                </div>
                <h4 className="inbox-item-subject">{email.subject}</h4>
                <p className="inbox-item-sender">Destinataire: {email.to}</p>
                <button 
                  type="button" 
                  className="inbox-item-delete" 
                  onClick={(e) => handleDeleteEmail(e, email.id)}
                  title="Supprimer l'alerte"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Corps de l'email sélectionné (Detail View) */}
          <div className="inbox-detail-view">
            {selectedEmail ? (
              <div className="email-viewer fade-in">
                <div className="email-viewer-header">
                  <h2>{selectedEmail.subject}</h2>
                  <div className="email-viewer-meta">
                    <div>
                      <p><strong>De:</strong> LEONI Auto-Supervision &lt;alerts@leoni.com&gt;</p>
                      <p><strong>À:</strong> {selectedEmail.to}</p>
                    </div>
                    <span className="email-viewer-date">{new Date(selectedEmail.date).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                <div 
                  className="email-viewer-body"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                />
              </div>
            ) : (
              <div className="email-viewer-placeholder">
                <p>Sélectionnez une alerte pour afficher son contenu.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertesInbox;
