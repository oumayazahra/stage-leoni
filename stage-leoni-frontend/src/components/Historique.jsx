import React from 'react';
import { useAuth } from '../context/AuthContext';

const Historique = ({ historique }) => {
  const { user } = useAuth();

  if (user?.role !== 'manager') {
    return (
      <div className="historique-forbidden">
        <div className="forbidden-icon">🛡️</div>
        <h3>Accès Restreint</h3>
        <p>
          En tant que **Technicien Support IT**, vous n'avez pas l'autorisation de consulter 
          l'historique des accès physiques et des tentatives de badgeage de la salle serveur.
        </p>
        <span className="forbidden-note">Contactez votre responsable d'infrastructure IT (Manager) pour toute demande.</span>
      </div>
    );
  }

  return (
    <div className="historique-card">
      <div className="historique-header">
        <h2>📋 Journal des Accès Physiques</h2>
        <span className="logs-count">{historique.length} entrées enregistrées</span>
      </div>
      
      {historique.length === 0 ? (
        <div className="no-logs-placeholder">Aucune tentative d'accès enregistrée pour cette salle.</div>
      ) : (
        <div className="table-responsive">
          <table className="historique-table">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Identifiant Badge</th>
                <th>Salle</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((item, idx) => (
                <tr key={idx} className="log-row">
                  <td className="log-time">
                    {new Date(item.date).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="log-badge">
                    <span className="badge-tag-id">🔑 {item.badgeId}</span>
                  </td>
                  <td className="log-room">
                    {item.salleId === 'salle_main' ? 'Salle Main' : 'Salle Backup'}
                  </td>
                  <td className="log-status">
                    <span className={`status-badge ${item.statut === 'autorisé' ? 'status-autorise' : 'status-refuse'}`}>
                      {item.statut === 'autorisé' ? '🟢 Autorisé' : '🔴 Refusé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Historique;