# Journal de Stage — ISIMG (Institut Supérieur d'Informatique et de Multimédia de Gabès)

**Organisme d'accueil :** LEONI Tunisia (Département IT & Process Management)  
**Date :** 06/07/2025  
**Version :** 00  

---

## PAGE 1 SUR 3 : Information de l'étudiant

| Champ | Information Remplie |
| :--- | :--- |
| **Nom et prénom de l'étudiant** | **Oumaya Zahra MANSOUR** |
| **N° CIN** | `[Votre N° CIN]` |
| **Filière** | **Licence en Sciences de l'Informatique** |
| **Etablissement d'accueil** | **LEONI Tunisia** (Département IT & Process Management) |
| **Période du stage** | du **09 / 06 / 2025** au **08 / 07 / 2025** |

*Signature et cachet de l'établissement d'accueil (Bas de page)*

---

## PAGE 2 SUR 3 : Activités Hebdomadaires (Semaines 1 et 2)

### **Activités hebdomadaires du stagiaire**

| Semaines | Résumé des activités |
| :--- | :--- |
| **Semaine 1**<br>*(09/06/2025 – 15/06/2025)* | • **Accueil & Intégration :** Prise de contact avec l'équipe du département IT & Process Management de LEONI Tunisia.<br>• **Analyse de l'existant :** Étude des processus actuels de surveillance des salles serveurs (relevés manuels de température/humidité, manque de traçabilité des accès physiques).<br>• **Cahier des Charges :** Spécification des besoins fonctionnels et techniques du projet **LEONI Control Center** (supervision IoT, badges RFID, alertes d'urgence et assistant IA).<br>• **Prise en main du matériel :** Prise en main et tests individuels de la carte **ESP32 DevKit V1**, du capteur **DHT11**, du lecteur RFID **RC522** (13.56 MHz) et de la **LED RGB**.<br>• **Maquette Physique :** Assemblage du prototype sur breadboard et vérification des premiers signaux. |
| **Semaine 2**<br>*(16/06/2025 – 22/06/2025)* | • **Architecture du système :** Conception de l'architecture 3-Tiers (Edge IoT / Backend Node.js / Frontend React).<br>• **Modélisation de la Base de Données :** Création du schéma relationnel (MCD/ERD) sous **SQLite** via l'ORM **Sequelize** (tables `Salle`, `Badge`, `Autorisation`, `Historique`, `Mesure`).<br>• **Développement API REST Backend :** Implémentation du serveur **Node.js / Express.js**, développement des routes d'enregistrement des mesures climatiques et de vérification des badges RFID.<br>• **Service d'Alertes Automatiques :** Intégration de **Nodemailer** (SMTP) pour l'envoi d'e-mails d'alerte en cas de température > 28°C, humidité > 70% ou 3 accès refusés consécutifs.<br>• **Cooldown Anti-Spam :** Implémentation d'une temporisation de 5 minutes sur l'envoi d'alertes identiques. |

---

## PAGE 3 SUR 3 : Activités Hebdomadaires (Semaines 3 et 4)

| Semaines | Résumé des activités |
| :--- | :--- |
| **Semaine 3**<br>*(23/06/2025 – 29/06/2025)* | • **Firmware C++ ESP32 :** Programmation sur Arduino IDE. Communication SPI avec le module RFID RC522, lecture Single-Wire du DHT11 et gestion des couleurs de la LED RGB (Vert/Rouge/Bleu).<br>• **Communication réseau IoT :** Transmission des mesures et des lectures de badges via requêtes HTTP POST vers le backend Node.js avec reconnexion Wi-Fi automatique.<br>• **Frontend React.js / Vite :** Développement d'une SPA réactive (Landing Page, Authentification sécurisée par badge administrateur).<br>• **Dashboard & Graphiques :** Création de l'interface Multi-Sites / Multi-Salles, des jauges d'indicateurs en temps réel et des courbes dynamiques de métriques.<br>• **Gestion des Badges & Historiques :** Réalisation des vues CRUD de gestion des cartes/badges et consultation de l'historique complet des accès. |
| **Semaine 4**<br>*(30/06/2025 – 08/07/2025)* | • **Assistant IA (Chatbot / Voicebot) :** Intégration du modèle **LLaMA 3.3 70B** via le SDK **Groq Cloud**.<br>• **Contextualisation & Interface Vocale :** Injection en temps réel de l'état des salles dans le System Prompt. Intégration de la reconnaissance/synthèse vocale (**Web Speech API**) et streaming des réponses (**SSE**).<br>• **Agentic Actions & Fallback Local :** Prise en charge des demandes d'alerte directes et fallback algorithmique local en cas de perte de connexion.<br>• **Tests & Recette :** Tests d'intégration de bout en bout (Hardware ESP32, API Node.js, Frontend React, IA).<br>• **Rapport & Bilan :** Rédaction du rapport de stage final et finalisation du Journal de Stage. |

---

### Valideurs
* **Approbation de l'encadrant académique** (Emplacement signature)
* **Signature et cachet de l'entreprise** (Emplacement signature)
