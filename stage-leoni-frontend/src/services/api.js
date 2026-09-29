import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

export const getCapteurs = (salleId) => api.get('/capteurs', { params: { salleId } });
export const getHistorique = (salleId) => api.get('/acces', { params: { salleId } });
export const getDernierAcces = () => api.get('/acces/dernier');
export const getBadgesAutorises = (salleId) => api.get('/acces/badges', { params: { salleId } });
export const verifierBadge = (badgeId, salleId) => api.post('/acces/verifier', { badgeId, salleId });
export const ajouterBadge = (salleId, badgeId, email, role) => api.post('/acces/ajouter-badge', { salleId, badgeId, email, role });
export const supprimerBadge = (salleId, badgeId) => api.post('/acces/supprimer-badge', { salleId, badgeId });
export const postChatbotQuery = (query, salleId, role, badgeId) => api.post('/chatbot/query', { query, salleId, role, badgeId });
export const getEmails = () => api.get('/emails');
export const markEmailAsRead = (id) => api.post('/emails/read', { id });
export const deleteEmail = (id) => api.delete(`/emails/${id}`);
export const getSmtpConfig = () => api.get('/smtp/config');
export const saveSmtpConfig = (config) => api.post('/smtp/config', config);
export const testSmtpConnection = (testEmail) => api.post('/smtp/test', { testEmail });
export const getCapteursHistorique = (salleId, limit = 30) => api.get('/capteurs/historique', { params: { salleId, limit } });
export const getSites = () => api.get('/sites');
export const getSallesParSite = (siteId) => api.get(`/sites/${siteId}/salles`);