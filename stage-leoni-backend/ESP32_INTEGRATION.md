# Guide d'intégration matérielle (IoT) - Leoni Server Room

Ce guide décrit comment connecter une carte microcontrôleur **ESP32** physique avec les capteurs, le lecteur RFID, et le système de verrouillage, et comment la faire communiquer avec la plateforme web.

---

## 1. Composants requis
1. **Carte ESP32** (NodeMCU ESP32 par exemple)
2. **Lecteur RFID RC522** (pour les badges d'accès)
3. **Capteur DHT11** (Température et Humidité — câblage identique au DHT22)
4. **LED RGB anode commune** + 3 résistances 220 Ω — remplace relais + LEDs séparées
5. **Breadboard et câbles de prototypage**

> Variante relais : si vous utilisez un module relais pour la gâche, remplacez la LED RGB par un relais sur GPIO 2 et allumez `digitalWrite(2, HIGH)` en cas d'accès autorisé.

---

## 2. Schéma de câblage (Pinout ESP32)

### Lecteur RFID RC522 (Interface SPI)
| RC522 Pin | ESP32 Pin | Rôle |
| :--- | :--- | :--- |
| **SDA (SS)** | GPIO 5 | Chip Select SPI |
| **SCK** | GPIO 18 | Clock SPI |
| **MOSI** | GPIO 23 | Master Out Slave In |
| **MISO** | GPIO 19 | Master In Slave Out |
| **IRQ** | *Non connecté* | - |
| **GND** | GND | Masse |
| **RST** | GPIO 22 | Reset |
| **3.3V** | 3.3V | Alimentation (3.3V uniquement !) |

### Capteur DHT11 (Données environnementales)
| DHT11 Pin | ESP32 Pin | Rôle |
| :--- | :--- | :--- |
| **VCC** | 3.3V ou 5V | Alimentation |
| **DATA** | GPIO 4 | Entrée numérique (résistance pull-up 10 kΩ entre DATA et VCC si absente sur le module) |
| **GND** | GND | Masse |

> **DHT11 vs DHT22** : même câblage (3 fils). Dans le code, `#define DHTTYPE DHT11`. Précision DHT11 : ±2 °C, ±5 % HR. Attendre **2 s** après `dht.begin()` avant la première lecture.

### LED RGB anode commune (retour visuel d'accès)
Broche **COM (anode)** → **3.3V**. Chaque couleur via une résistance 220 Ω vers un GPIO.

| LED RGB | ESP32 Pin | Couleur / état |
| :--- | :--- | :--- |
| **R (Rouge)** | GPIO 13 | Accès refusé |
| **G (Vert)** | GPIO 12 | Accès autorisé |
| **B (Bleu)** | GPIO 2 | Système prêt / en attente |
| **COM (anode)** | 3.3V | Alimentation commune |

> **Logique anode commune** : `LOW` sur le GPIO = couleur allumée, `HIGH` = éteinte (déjà configuré dans `hardware/esp32-leoni.ino`).

| État | Couleur |
| :--- | :--- |
| Prêt, WiFi OK | Bleu |
| Accès autorisé | Vert (3 s) |
| Accès refusé | Rouge (2 s) |
| WiFi déconnecté | Rouge clignotant |

---

## 3. Code source ESP32 (Arduino C++)

Le code source complet pour matériel réel (LED RGB) est dans le dossier **`hardware/esp32-leoni.ino`** à la racine du projet.

Vous devez au préalable installer les bibliothèques suivantes via le gestionnaire de bibliothèques Arduino :
- **MFRC522** (par GithubCommunity)
- **DHT sensor library** (par Adafruit)
- **Adafruit Unified Sensor** (par Adafruit)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>

// 1. Configuration Réseau WiFi et Backend
const char* ssid = "VOTRE_SSID_WIFI";
const char* password = "VOTRE_MOT_DE_PASSE_WIFI";
const String backendUrl = "http://192.168.1.50:5000/api"; // Remplacez par l'IP de votre PC backend
const String salleId = "salleA"; // "salleA" ou "salleB" selon l'emplacement physique de la carte

// 2. Configuration des Pins
#define DHTPIN 4
#define DHTTYPE DHT11
#define SS_PIN 5
#define RST_PIN 22
#define RELAY_PIN 2
#define LED_GREEN 12
#define LED_RED 13

// Initialisation des capteurs
DHT dht(DHTPIN, DHTTYPE);
MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastSensorTime = 0;
const unsigned long sensorInterval = 10000; // Envoyer les mesures environnementales toutes les 10 secondes

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  dht.begin();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);

  // Connexion WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connexion au WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connecté !");
  Serial.print("Adresse IP de l'ESP32 : ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Reconnexion WiFi si déconnecté
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconnexion WiFi...");
    WiFi.disconnect();
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // A. Lecture environnementale périodique
  if (millis() - lastSensorTime >= sensorInterval) {
    lastSensorTime = millis();
    envoyerDonneesCapteurs();
  }

  // B. Lecture du lecteur RFID (badge)
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Récupérer l'identifiant du badge en format hexadécimal (6 caractères max pour le mock ou complet)
  String badgeId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    badgeId += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    badgeId += String(mfrc522.uid.uidByte[i], HEX);
  }
  badgeId.toUpperCase();
  // Pour le prototype, on prend les 6 premiers caractères si nécessaire
  badgeId = badgeId.substring(0, 6);

  Serial.println("\n--- Badge détecté ---");
  Serial.print("Badge ID : ");
  Serial.println(badgeId);

  // Vérifier l'accès via le backend
  verifierAccesBadge(badgeId);

  // Stopper la lecture sur le badge actuel
  mfrc522.PICC_HaltA();
}

// Fonction pour envoyer les données de température et d'humidité
void envoyerDonneesCapteurs() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("Échec de lecture du capteur DHT11 !");
    return;
  }

  HTTPClient http;
  http.begin(backendUrl + "/capteurs/update");
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\"salleId\":\"" + salleId + "\",\"temperature\":" + String(t) + ",\"humidite\":" + String(h) + "}";
  
  Serial.print("Envoi des données capteurs : ");
  Serial.println(jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Réponse HTTP : ");
    Serial.println(response);
  } else {
    Serial.print("Erreur d'envoi HTTP : ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

// Fonction pour vérifier l'accès avec le badge
void verifierAccesBadge(String badgeId) {
  HTTPClient http;
  http.begin(backendUrl + "/acces/verifier");
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\"badgeId\":\"" + badgeId + "\",\"salleId\":\"" + salleId + "\"}";
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Réponse HTTP : ");
    Serial.println(response);

    // Analyse rudimentaire du JSON (recherche de '"autorise":true')
    if (response.indexOf("\"autorise\":true") != -1) {
      Serial.println(">>> ACCÈS AUTORISÉ ! Ouverture de la porte.");
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(RELAY_PIN, HIGH); // Déclenche le relais (ouvert)
      delay(3000); // Garde la porte ouverte 3 secondes
      digitalWrite(RELAY_PIN, LOW);  // Referme la porte (relais au repos)
      digitalWrite(LED_GREEN, LOW);
    } else {
      Serial.println(">>> ACCÈS REFUSÉ !");
      digitalWrite(LED_RED, HIGH);
      delay(2000); // Allume la LED rouge pendant 2 secondes
      digitalWrite(LED_RED, LOW);
    }
  } else {
    Serial.print("Erreur lors de la requête de vérification : ");
    Serial.println(httpResponseCode);
    
    // Clignoter LED rouge en cas de problème de connexion backend
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_RED, HIGH);
      delay(200);
      digitalWrite(LED_RED, LOW);
      delay(200);
    }
  }
  http.end();
}
```
