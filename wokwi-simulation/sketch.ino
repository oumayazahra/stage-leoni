// =====================================================
// LEONI - Simulation Wokwi (ESP32 + RFID RC522 + DHT22)
// Adapté au backend stage-leoni-backend (port 5000)
// =====================================================
// API utilisées :
//   POST /api/capteurs/update  → envoi température / humidité
//   POST /api/acces/verifier   → vérification badge RFID
// =====================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>

// === Configuration WiFi ===
const char* ssid = "Wokwi-GUEST";   // Wokwi : laisser tel quel
const char* password = "";          // Matériel réel : mettre votre mot de passe

// === Backend LEONI ===
// Wokwi for VS Code  → http://localhost:5000/api
// Matériel réel      → http://192.168.1.XX:5000/api  (IP de votre PC)
// Wokwi en ligne     → https://xxxx.ngrok-free.app/api
String backendUrl = "http://localhost:5000/api";

// === Salle supervisée par cet ESP32 ===
String salleId = "salle_main";  // Changer en "salle_backup" pour la 2e salle

// === Broches (votre câblage) ===
#define SS_PIN   4
#define RST_PIN  22
#define DHTPIN   5
#define LED_OK   12   // Vert  = accès autorisé
#define LED_KO   13   // Rouge = accès refusé
#define DHTTYPE  DHT22

// === Initialisation ===
MFRC522 rfid(SS_PIN, RST_PIN);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSensorMs = 0;
const unsigned long SENSOR_INTERVAL = 10000; // Envoi capteurs toutes les 10 s

// === Convertir UID RFID en chaîne hexadécimale ===
String uidToString(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// === Adapter l'UID Wokwi au badgeId du backend ===
// Ex. tag Wokwi A1:B2:C3:00 → "A1B2C300" → badge backend "A1B2C3"
String normalizeBadgeId(String uid) {
  String badgeId = uid;
  while (badgeId.length() > 4 && badgeId.endsWith("00")) {
    badgeId = badgeId.substring(0, badgeId.length() - 2);
  }
  return badgeId;
}

// === Envoyer température / humidité au dashboard ===
void envoyerCapteurs() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("❌ Erreur lecture DHT22");
    return;
  }

  Serial.printf("🌡️ Temp: %.1f °C | 💧 Hum: %.1f %%", temp, hum);
  if (temp > 28.0) Serial.print(" ⚠️ SURCHAUFFE");
  if (hum > 70.0)  Serial.print(" ⚠️ HUMIDITÉ");
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(backendUrl + "/capteurs/update");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"salleId\":\"" + salleId
                 + "\",\"temperature\":" + String(temp, 1)
                 + ",\"humidite\":" + String(hum, 0) + "}";

  int code = http.POST(payload);
  if (code > 0) {
    Serial.println("   ✅ Capteurs envoyés (HTTP " + String(code) + ")");
  } else {
    Serial.println("   ❌ Erreur envoi capteurs : " + http.errorToString(code));
  }
  http.end();
}

// === Vérifier le badge auprès du backend LEONI ===
void verifierBadge(String badgeId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("   ❌ WiFi non connecté");
    return;
  }

  HTTPClient http;
  http.begin(backendUrl + "/acces/verifier");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"badgeId\":\"" + badgeId
                 + "\",\"salleId\":\"" + salleId + "\"}";

  Serial.println("   → POST /acces/verifier : " + payload);
  int code = http.POST(payload);

  if (code > 0) {
    String response = http.getString();
    Serial.println("   ← Réponse : " + response);

    if (response.indexOf("\"autorise\":true") != -1) {
      Serial.println("   ✅ ACCÈS AUTORISÉ — Porte déverrouillée");
      digitalWrite(LED_OK, HIGH);
      digitalWrite(LED_KO, LOW);
      delay(3000);
      digitalWrite(LED_OK, LOW);
      Serial.println("   🔒 Porte reverrouillée");
    } else {
      Serial.println("   ❌ ACCÈS REFUSÉ");
      digitalWrite(LED_KO, HIGH);
      digitalWrite(LED_OK, LOW);
      delay(2000);
      digitalWrite(LED_KO, LOW);
    }
  } else {
    Serial.println("   ❌ Erreur serveur : " + http.errorToString(code));
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_KO, HIGH); delay(150);
      digitalWrite(LED_KO, LOW);  delay(150);
    }
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔══════════════════════════════════╗");
  Serial.println("║   LEONI Control Center — IoT     ║");
  Serial.println("╚══════════════════════════════════╝");
  Serial.println("Salle   : " + salleId);
  Serial.println("Backend : " + backendUrl);

  pinMode(LED_OK, OUTPUT);
  pinMode(LED_KO, OUTPUT);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_KO, LOW);

  SPI.begin();
  rfid.PCD_Init();
  dht.begin();
  Serial.println("✅ RFID RC522 prêt");
  Serial.println("✅ DHT22 prêt");

  WiFi.begin(ssid, password);
  Serial.print("📶 Connexion WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connecté");
  Serial.println("   IP : " + WiFi.localIP().toString());

  envoyerCapteurs();
  Serial.println("\n🔑 Présentez un badge RFID...\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi déconnecté — reconnexion...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // Envoi périodique des mesures DHT22 → dashboard web
  if (millis() - lastSensorMs >= SENSOR_INTERVAL) {
    lastSensorMs = millis();
    envoyerCapteurs();
  }

  // Lecture RFID
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uidBrut = uidToString(rfid.uid.uidByte, rfid.uid.size);
  String badgeId = normalizeBadgeId(uidBrut);

  Serial.println("🔑 Badge détecté");
  Serial.println("   UID brut  : " + uidBrut);
  Serial.println("   Badge ID  : " + badgeId);

  verifierBadge(badgeId);

  rfid.PICC_HaltA();
  delay(500);
}
