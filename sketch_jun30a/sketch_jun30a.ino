// ============================================================
// LEONI Control Center — ESP32 (cathode commune)
// Version finale avec remontée backend intégrale (First-Boot)
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>

// ─── CONFIGURATION ─────────────────────────────────────
//const char* WIFI_SSID     = "GlobalNet-2024";
//const char* WIFI_PASSWORD = "gnet349254";

const char* WIFI_SSID     = "OPPO A1k";
const char* WIFI_PASSWORD = "0728b89089aa";
String backendUrl = "http://192.168.1.14:5000/api";
String salleId    = "salle_main"; // Modifié : nom de salle reconnu par la DB

// ─── BROCHES ──────────────────────────────────────────
#define PIN_RFID_SS   5
#define PIN_RFID_RST  22
#define PIN_DHT       4
#define DHTTYPE       DHT11
#define PIN_RGB_R     13
#define PIN_RGB_G     12
#define PIN_RGB_B     2

// ─── OBJETS ───────────────────────────────────────────
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
DHT dht(PIN_DHT, DHTTYPE);

unsigned long lastSensorMs = 0;
const unsigned long SENSOR_INTERVAL_MS = 10000;
unsigned long lastLogMs = 0;
const unsigned long LOG_INTERVAL_MS = 5000;

// ─── LED RGB (cathode commune) ──────────────────────
void setRgb(bool r, bool g, bool b) {
  digitalWrite(PIN_RGB_R, r ? HIGH : LOW);
  digitalWrite(PIN_RGB_G, g ? HIGH : LOW);
  digitalWrite(PIN_RGB_B, b ? HIGH : LOW);
}

void rgbOff()   { setRgb(false, false, false); }
void rgbGreen() { setRgb(false, true,  false); }
void rgbRed()   { setRgb(true,  false, false); }
void rgbBlue()  { setRgb(false, false, true);  }

void rgbBlinkGreen(int times, int ms) {
  for (int i = 0; i < times; i++) {
    rgbGreen(); delay(ms); rgbOff(); delay(ms);
  }
}

void rgbBlinkRed(int times, int ms) {
  for (int i = 0; i < times; i++) {
    rgbRed(); delay(ms); rgbOff(); delay(ms);
  }
}

void rgbBlinkBlue(int times, int ms) {
  for (int i = 0; i < times; i++) {
    rgbBlue(); delay(ms); rgbOff(); delay(ms);
  }
}

// ─── RFID ─────────────────────────────────────────────
String uidToString(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

String normalizeBadgeId(String uid) {
  String badgeId = uid;
  while (badgeId.length() > 4 && badgeId.endsWith("00")) {
    badgeId = badgeId.substring(0, badgeId.length() - 2);
  }
  return badgeId;
}

// ─── VÉRIFICATION DU LECTEUR RFID ────────────────────
bool verifierRFID() {
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[RFID] ❌ Lecteur NON détecté ! Vérifiez le câblage (SPI, 3.3V, GND).");
    return false;
  } else {
    Serial.printf("[RFID] ✅ Lecteur détecté (version 0x%02X)\n", version);
    return true;
  }
}

// ─── HTTP : capteurs ─────────────────────────────────
void envoyerCapteurs() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("[DHT11] ❌ Erreur de lecture");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.printf("[DHT11] 🌡️ Temp: %.1f °C | 💧 Hum: %.0f %%\n", temp, hum);

  bool alerte = false;
  if (temp > 28.0) {
    Serial.println("[DHT11] ⚠️ ALERTE : Température > 28°C !");
    alerte = true;
  }
  if (hum > 70.0) {
    Serial.println("[DHT11] ⚠️ ALERTE : Humidité > 70% !");
    alerte = true;
  }
  if (alerte) {
    rgbBlinkBlue(3, 200);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] ❌ WiFi déconnecté — capteurs non envoyés");
    return;
  }

  HTTPClient http;
  http.setTimeout(8000);
  http.begin(backendUrl + "/capteurs/update");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"salleId\":\"" + salleId
                 + "\",\"temperature\":" + String(temp, 1)
                 + ",\"humidite\":" + String(hum, 0) + "}";

  Serial.print("[HTTP] Envoi capteurs → ");
  Serial.println(payload);

  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[HTTP] ✅ Capteurs OK (code %d) → %s\n", code, http.getString().c_str());
  } else {
    Serial.printf("[HTTP] ❌ Erreur capteurs: %s\n", http.errorToString(code).c_str());
  }
  http.end();
  Serial.println("─────────────────────────────────────────");
}

// ─── HTTP : vérification badge ──────────────────────
void verifierBadge(String badgeId, String uidBrut) {
  Serial.println("─────────────────────────────────────────");
  Serial.println("[RFID] 🔍 Vérification du badge...");
  Serial.printf("       UID brut   : %s\n", uidBrut.c_str());
  Serial.printf("       Badge ID   : %s\n", badgeId.c_str());
  Serial.printf("       Salle      : %s\n", salleId.c_str());

  // --- Vérification standard via backend ---
  // Gère toutes les authentifications et l'enregistrement du 1er Manager (First-Boot)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[RFID] ❌ WiFi déconnecté — impossible de vérifier");
    rgbBlinkRed(3, 150);
    return;
  }

  HTTPClient http;
  http.setTimeout(8000);
  http.begin(backendUrl + "/acces/verifier");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"badgeId\":\"" + badgeId
                 + "\",\"salleId\":\"" + salleId + "\"}";

  Serial.print("[HTTP] Requête → ");
  Serial.println(payload);

  int code = http.POST(payload);
  if (code > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Réponse (code %d) → %s\n", code, response.c_str());

    if (response.indexOf("\"autorise\":true") != -1) {
      Serial.println("[RFID] ✅ ACCÈS AUTORISÉ");
      rgbBlinkGreen(3, 200);
    } else {
      Serial.println("[RFID] ❌ ACCÈS REFUSÉ");
      rgbBlinkRed(3, 200);
    }
  } else {
    Serial.printf("[HTTP] ❌ Erreur serveur: %s\n", http.errorToString(code).c_str());
    rgbBlinkRed(3, 150);
  }

  http.end();
  rgbBlue();  // retour en veille
  Serial.println("─────────────────────────────────────────");
}

// ─── WiFi ─────────────────────────────────────────────
bool connecterWiFi() {
  Serial.print("[WiFi] Connexion à ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentatives = 0;
  while (WiFi.status() != WL_CONNECTED && tentatives < 40) {
    delay(500);
    Serial.print(".");
    tentatives++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] ✅ Connecté — IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("[WiFi] ❌ Échec de connexion");
  return false;
}

// ─── SETUP ────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("═══════════════════════════════════════════");
  Serial.println("  🏢 LEONI Control Center — ESP32 IoT");
  Serial.println("═══════════════════════════════════════════");
  Serial.println("  Salle   : " + salleId);
  Serial.println("  Backend : " + backendUrl);
  Serial.println("  LED RGB : cathode commune (HIGH = allumé)");
  Serial.println("═══════════════════════════════════════════");

  pinMode(PIN_RGB_R, OUTPUT);
  pinMode(PIN_RGB_G, OUTPUT);
  pinMode(PIN_RGB_B, OUTPUT);
  rgbOff();

  SPI.begin();
  rfid.PCD_Init();

  if (verifierRFID()) {
    Serial.println("[RFID] ✅ RC522 opérationnel");
  } else {
    Serial.println("[RFID] ❌ ERREUR : module RC522 non détecté !");
    Serial.println("       Vérifiez le câblage : SDA=GPIO5, RST=GPIO22, SCK=GPIO18, MOSI=GPIO23, MISO=GPIO19, VCC=3.3V, GND.");
    rgbRed();
    while (true) {
      delay(1000);
      Serial.println("[RFID] 🔴 En attente de correction...");
    }
  }

  dht.begin();
  delay(2000);
  Serial.println("[DHT11] ✅ Capteur prêt");

  if (connecterWiFi()) {
    rgbBlue();
    envoyerCapteurs();
  } else {
    rgbRed();
    Serial.println("[RFID] 🔴 Mode hors-ligne détecté");
  }

  Serial.println("\n[RFID] 🟢 En attente d'un badge...");
  Serial.println("[INFO] Le programme tourne, un log 'En attente...' s'affiche toutes les 5s");
}

// ─── LOOP ─────────────────────────────────────────────
void loop() {
  // --- Log périodique ---
  if (millis() - lastLogMs >= LOG_INTERVAL_MS) {
    lastLogMs = millis();
    Serial.print("[LOOP] ✅ En attente d'un badge... (");
    Serial.print(millis() / 1000);
    Serial.println("s)");
  }

  // --- Reconnexion WiFi ---
  if (WiFi.status() != WL_CONNECTED) {
    rgbRed();
    if (!connecterWiFi()) {
      delay(3000);
      return;
    }
    rgbBlue();
  }

  // --- Envoi capteurs périodique ---
  if (millis() - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = millis();
    envoyerCapteurs();
  }

  // --- Lecture RFID ---
  if (rfid.PICC_IsNewCardPresent()) {
    if (rfid.PICC_ReadCardSerial()) {
      String uidBrut = uidToString(rfid.uid.uidByte, rfid.uid.size);
      String badgeId = normalizeBadgeId(uidBrut);

      Serial.println();
      Serial.println("═══════════════════════════════════════════");
      Serial.println("[RFID] 🛑 BADGE DÉTECTÉ !");
      Serial.printf("       Taille UID : %d octets\n", rfid.uid.size);
      Serial.printf("       UID brut   : %s\n", uidBrut.c_str());
      Serial.printf("       Badge ID   : %s\n", badgeId.c_str());

      verifierBadge(badgeId, uidBrut);

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    } else {
      Serial.println("[RFID] ⚠️ Carte détectée mais erreur de lecture");
    }
  }

  delay(200);
}
