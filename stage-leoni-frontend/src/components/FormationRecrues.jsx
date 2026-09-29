import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/FormationRecrues.css';

const FormationRecrues = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cours'); // 'cours' | 'quiz' | 'certificat'
  const [activeLesson, setActiveLesson] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const cours = [
    {
      title: "1. Architecture Générale",
      icon: "🏢",
      content: `LEONI possède deux salles serveurs redondantes et hautement sécurisées :
      • <strong>Salle A (Production)</strong> : Héberge le cœur de réseau (Backbone), les serveurs de virtualisation VMware exécutant les bases de données et les progiciels de production. L'alimentation y est régulée par un onduleur APC Symmetra PX de 96kW (45 min d'autonomie).
      • <strong>Salle B (Secours / Disaster Recovery)</strong> : Située dans un bâtiment séparé pour parer aux sinistres. Elle contient les serveurs de sauvegarde Veeam et réplique en temps réel les données critiques de la Salle A.`
    },
    {
      title: "2. Le Coeur de Réseau (Backbone)",
      icon: "⚡",
      content: `Le Backbone (cœur de réseau) assure l'interconnexion à très haut débit :
      • <strong>Matériel</strong> : Composé de commutateurs de classe datacenter <strong>Cisco Nexus</strong> configurés en vPC (virtual Port Channel) pour éliminer tout point de défaillance unique.
      • <strong>Liaisons</strong> : Double liaison par fibre optique monomode de 10 Gbps circulant dans des chemins de câbles distincts et protégés.
      • <strong>Fonction</strong> : Relie le réseau industriel (machines de câblage), le réseau administratif, et les concentrateurs IoT (comme nos passerelles ESP32).`
    },
    {
      title: "3. Sécurité & Pare-feu (Firewall)",
      icon: "🛡️",
      content: `La protection périmétrique et interne est assurée de manière rigoureuse :
      • <strong>Cluster HA</strong> : Deux pare-feu <strong>Fortinet FortiGate</strong> configurés en Haute Disponibilité (Actif/Passif). Si le firewall principal tombe en panne, le secondaire prend le relais en moins d'une seconde.
      • <strong>Filtrage</strong> : cloisonnement strict par VLANs. Le réseau IoT des capteurs environnementaux est totalement isolé du réseau industriel pour éviter les cyberattaques. Seuls les protocoles sécurisés autorisés (comme HTTPS vers le port 5000) peuvent transiter.`
    },
    {
      title: "4. Procédures de Cas Critiques",
      icon: "🚨",
      content: `En cas d'incident, chaque seconde compte. Voici les 4 alarmes clés :
      • <strong>Surchauffe (> 28°C)</strong> : Déclenche un e-mail automatique. Ouvrir les portes d'accès, activer les climatiseurs mobiles et ventiler.
      • <strong>Humidité (> 70%)</strong> : Risque de condensation. Rechercher des fuites au niveau des condensats de clim, activer le déshumidificateur.
      • <strong>Suspicion d'Intrusion</strong> : 3 passages de badges refusés consécutifs. Le système bloque la porte, envoie un email d'urgence et requiert de vérifier les caméras IP.
      • <strong>Coupure de Courant</strong> : Fonctionnement sur Onduleur (UPS). Si l'autonomie restante descend sous 15%, éteindre proprement les serveurs secondaires.`
    }
  ];

  const questions = [
    {
      id: 1,
      q: "Quel est le seuil maximal de température toléré avant le déclenchement d'un e-mail d'alerte critique ?",
      options: ["20.0 °C", "24.5 °C", "28.0 °C", "35.0 °C"],
      correct: 2
    },
    {
      id: 2,
      q: "Quels équipements assurent la sécurité réseau et le filtrage en Haute Disponibilité (HA) ?",
      options: ["Commutateurs Cisco Catalyst", "Stockage SAN HPE MSA", "Onduleurs APC Symmetra", "Pare-feu Fortinet FortiGate"],
      correct: 3
    },
    {
      id: 3,
      q: "Quelle est la configuration physique du Backbone (cœur de réseau) reliant les Salles A et B ?",
      options: [
        "Un simple câble réseau RJ45 blindé de 100 mètres",
        "Deux commutateurs Cisco Nexus reliés par double fibre optique 10 Gbps",
        "Une liaison Wifi industrielle longue portée",
        "Une connexion VPN cryptée via Internet public"
      ],
      correct: 1
    },
    {
      id: 4,
      q: "Que se passe-t-il automatiquement si un badge inconnu ou non autorisé est détecté 3 fois de suite ?",
      options: [
        "Le système déclenche une sirène d'alarme sonore dans toute l'usine",
        "La base de données SQLite s'efface par sécurité",
        "Un e-mail d'alerte sécurité d'intrusion avec l'historique est envoyé à l'administrateur",
        "La porte est déverrouillée automatiquement pour des raisons de secours"
      ],
      correct: 2
    },
    {
      id: 5,
      q: "Quelle action prioritaire doit mener une recrue en cas de coupure de courant prolongée et de batterie faible (< 15%) sur l'onduleur ?",
      options: [
        "Lancer la procédure d'extinction propre (shutdown) des serveurs secondaires",
        "Appeler immédiatement le fournisseur d'énergie pour contester la panne",
        "Laisser les serveurs s'éteindre brutalement pour tester la tolérance aux pannes",
        "Transférer manuellement les serveurs physiques dans le coffre d'un véhicule"
      ],
      correct: 0
    }
  ];

  const handleSelectOption = (qId, optionIdx) => {
    if (quizSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const submitQuiz = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setQuizSubmitted(true);
    if (correctCount >= 4) {
      setActiveTab('certificat');
    }
  };

  const resetQuiz = () => {
    setAnswers({});
    setQuizSubmitted(false);
    setScore(0);
    setActiveTab('quiz');
  };

  return (
    <div className="formation-card">
      <div className="formation-header-tab">
        <div className="formation-title-group">
          <span className="formation-badge-icon">🎓</span>
          <div>
            <h3>Espace de Formation Recrues</h3>
            <p>Habilitation technique & procédures d'urgence salle serveur LEONI</p>
          </div>
        </div>
        <div className="formation-nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'cours' ? 'active' : ''}`}
            onClick={() => setActiveTab('cours')}
          >
            📖 Cours Théorique
          </button>
          <button 
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => {
              if (quizSubmitted && score >= 4) {
                setActiveTab('certificat');
              } else {
                setActiveTab('quiz');
              }
            }}
          >
            📝 Quiz de Validation {quizSubmitted && `(${score}/5)`}
          </button>
          {quizSubmitted && score >= 4 && (
            <button 
              className={`tab-btn ${activeTab === 'certificat' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificat')}
            >
              🏆 Certificat d'Habilitation
            </button>
          )}
        </div>
      </div>

      <div className="formation-body-content">
        {activeTab === 'cours' && (
          <div className="cours-container">
            <div className="cours-sidebar">
              {cours.map((lesson, idx) => (
                <button
                  key={idx}
                  className={`lesson-selector-btn ${activeLesson === idx ? 'selected' : ''}`}
                  onClick={() => setActiveLesson(idx)}
                >
                  <span className="lesson-icon">{lesson.icon}</span>
                  <span className="lesson-title">{lesson.title}</span>
                </button>
              ))}
              
              <div className="training-tip-box">
                <h5>💡 Astuce de Formation :</h5>
                <p>N'hésitez pas à poser des questions à l'Assistant Intelligent (chatbot en bas à droite) concernant les termes techniques comme "FortiGate", "Cisco Nexus" ou "procédures" ! Il est configuré pour vous aider.</p>
              </div>
            </div>

            <div className="cours-display-panel fade-in">
              <div className="panel-lesson-header">
                <span className="panel-lesson-icon">{cours[activeLesson].icon}</span>
                <h4>{cours[activeLesson].title}</h4>
              </div>
              <div 
                className="panel-lesson-text"
                dangerouslySetInnerHTML={{ __html: cours[activeLesson].content.replace(/\n/g, '<br />') }}
              />
              <div className="panel-navigation-footer">
                <button 
                  disabled={activeLesson === 0}
                  onClick={() => setActiveLesson(prev => prev - 1)}
                  className="lesson-nav-btn"
                >
                  ◀ Précédent
                </button>
                {activeLesson < cours.length - 1 ? (
                  <button 
                    onClick={() => setActiveLesson(prev => prev + 1)}
                    className="lesson-nav-btn btn-primary"
                  >
                    Suivant ▶
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTab('quiz')}
                    className="lesson-nav-btn btn-success"
                  >
                    Passer le Quiz 🚀
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="quiz-container fade-in">
            <div className="quiz-info-banner">
              <span>⚠️</span>
              <p>Vous devez obtenir au moins **4 bonnes réponses sur 5** pour valider votre habilitation de sécurité et obtenir votre badge virtuel habilité.</p>
            </div>

            <div className="quiz-questions-list">
              {questions.map((q, idx) => (
                <div key={q.id} className="quiz-question-card">
                  <h5 className="question-title">{idx + 1}. {q.q}</h5>
                  <div className="quiz-options-grid">
                    {q.options.map((opt, optIdx) => {
                      let btnClass = "";
                      if (quizSubmitted) {
                        if (optIdx === q.correct) {
                          btnClass = "correct-opt";
                        } else if (answers[q.id] === optIdx) {
                          btnClass = "wrong-opt";
                        } else {
                          btnClass = "disabled-opt";
                        }
                      } else if (answers[q.id] === optIdx) {
                        btnClass = "selected-opt";
                      }
                      
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={`quiz-option-btn ${btnClass}`}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          disabled={quizSubmitted}
                        >
                          <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                          <span className="opt-text">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="quiz-footer-actions">
              {!quizSubmitted ? (
                <button
                  type="button"
                  className="quiz-submit-btn"
                  onClick={submitQuiz}
                  disabled={Object.keys(answers).length < questions.length}
                >
                  Soumettre le Quiz et Calculer le Score
                </button>
              ) : (
                <div className="quiz-results-summary">
                  {score >= 4 ? (
                    <div className="score-badge success-badge">
                      <span>🎉 FÉLICITATIONS ! Score : {score}/5 (Réussi)</span>
                    </div>
                  ) : (
                    <div className="score-badge danger-badge">
                      <span>❌ ÉCHEC. Score : {score}/5 (Minimum requis: 4/5)</span>
                    </div>
                  )}
                  <div className="result-buttons">
                    {score >= 4 ? (
                      <button 
                        className="quiz-action-btn btn-cert"
                        onClick={() => setActiveTab('certificat')}
                      >
                        Afficher le Certificat 🏆
                      </button>
                    ) : (
                      <button 
                        className="quiz-action-btn btn-retry"
                        onClick={resetQuiz}
                      >
                        Recommencer le Test 🔄
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'certificat' && quizSubmitted && score >= 4 && (
          <div className="certificat-outer-container fade-in">
            <div className="certificat-frame" id="print-certificat">
              <div className="certificat-bg-watermark">LEONI</div>
              <div className="certificat-inner">
                <div className="cert-header">
                  <div className="cert-logo-placeholder">🏢</div>
                  <h2>LEONI Wiring Systems</h2>
                  <h3>IT & Infrastructure Security Division</h3>
                </div>

                <div className="cert-title-container">
                  <h1>CERTIFICAT D'HABILITATION TECHNIQUE</h1>
                  <p className="cert-subtitle">Salles Serveurs & Réseaux Critiques</p>
                </div>

                <div className="cert-body">
                  <p>Ce document atteste que l'opérateur technique associé au badge RFID :</p>
                  <div className="cert-badge-display">ID: {user?.badgeId || 'RECRUT-IT'}</div>
                  <p>a suivi avec succès la formation réglementaire et validé les examens de sécurité concernant la supervision, l'architecture réseau (Backbone Cisco Nexus, Firewall FortiGate) et les protocoles de gestion des incidents critiques de la salle serveur LEONI.</p>
                </div>

                <div className="cert-footer">
                  <div className="cert-signature">
                    <span className="sig-line"></span>
                    <span className="sig-title">Directeur des Systèmes d'Information</span>
                  </div>
                  <div className="cert-details-meta">
                    <span>Délivré le : <strong>{new Date().toLocaleDateString('fr-FR')}</strong></span>
                    <span>Statut Badge : <strong style={{color: '#10b981'}}>HABILITÉ ET ACTIF</strong></span>
                    <span>ID Certificat : <strong style={{fontFamily: 'monospace'}}>CERT-${user?.badgeId || 'TEST'}-${Math.floor(1000 + Math.random()*9000)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="certificat-print-actions">
              <button 
                type="button" 
                className="print-btn" 
                onClick={() => window.print()}
              >
                🖨️ Imprimer / Sauvegarder en PDF
              </button>
              <button 
                type="button" 
                className="quiz-reset-link" 
                onClick={resetQuiz}
              >
                Repasser le test pour s'entraîner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormationRecrues;
