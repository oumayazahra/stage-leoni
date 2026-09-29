// =====================================================
// LEONI Control Center — ESP32 (matériel réel)
// =====================================================
// Composants :
//   - Lecteur RFID RC522 (SPI)
//   - Capteur DHT11 (température / humidité)
//   - LED RGB anode commune (COM → 3.3V)
//
// Backend LEONI (stage-leoni-backend) :
//   POST /api/capteurs/update  → envoi mesures IoT
//   POST /api/acces/verifier   → vérification badge RFID
//
// Câblage :
//   RC522 SDA  → GPIO 5    |  DHT11 DATA → GPIO 4
//   RC522 RST  → GPIO 22   |  RGB R      → GPIO 13 (+ 220Ω)
//   RC522 SCK  → GPIO 18   |  RGB G      → GPIO 12 (+ 220Ω)
//   RC522 MOSI → GPIO 23   |  RGB B      → GPIO 2  (+ 220Ω)
//   RC522 MISO → GPIO 19   |  RGB COM    → 3.3V
//   RC522 3.3V / GND
// =====================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>

// ─── CONFIGURATION (à modifier) ───────────────────────
const char* WIFI_SSID     = "VOTRE_WIFI";
const char* WIFI_PASSWORD = "VOTRE_MOT_DE_PASSE";
String backendUrl = "http://192.168.1.XX:5000/api";  // IP du PC (ipconfig)
String salleId    = "salleA";                         // "salleA" ou "salleB"

// ─── BROCHES ──────────────────────────────────────────
#define PIN_RFID_SS   5
#define PIN_RFID_RST  22
#define PIN_DHT       4
#define DHTTYPE       DHT11

// LED RGB anode commune : LOW = allumé, HIGH = éteint
#define PIN_RGB_R  13
#define PIN_RGB_G  12
#define PIN_RGB_B  2

// ─── OBJETS ───────────────────────────────────────────
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
DHT dht(PIN_DHT, DHTTYPE);

unsigned long lastSensorMs = 0;
const unsigned long SENSOR_INTERVAL_MS = 10000;  // envoi toutes les 10 s

// ─── LED RGB (anode commune) ──────────────────────────
void setRgb(bool r, bool g, bool b) {
  digitalWrite(PIN_RGB_R, r ? LOW : HIGH);
  digitalWrite(PIN_RGB_G, g ? LOW : HIGH);
  digitalWrite(PIN_RGB_B, b ? LOW : HIGH);
}

void rgbOff()   { setRgb(false, false, false); }
void rgbGreen() { setRgb(false, true,  false); }
void rgbRed()   { setRgb(true,  false, false); }
void rgbBlue()  { setRgb(false, false, true);  }

void rgbBlinkRed(int times, int ms) {
  for (int i = 0; i < times; i++) {
    rgbRed();
    delay(ms);
    rgbOff();
    delay(ms);
  }
}

// ─── RFID : UID → badgeId backend ───────────────────
String uidToString(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// Ex. tag Wokwi A1:B2:C3:00 → "A1B2C300" → "A1B2C3"
String normalizeBadgeId(String uid) {
  String badgeId = uid;
  while (badgeId.length() > 4 && badgeId.endsWith("00")) {
    badgeId = badgeId.substring(0, badgeId.length() - 2);
  }
  return badgeId;
}

// ─── HTTP : capteurs DHT11 ────────────────────────────
void envoyerCapteurs() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("[DHT11] Erreur de lecture");
    return;
  }

  Serial.printf("[DHT11] Temp: %.1f C | Hum: %.0f %%", temp, hum);
  if (temp > 28.0) Serial.print(" | ALERTE TEMP");
  if (hum  > 70.0) Serial.print(" | ALERTE HUM");
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi deconnecte — capteurs non envoyes");
    return;
  }

  HTTPClient http;
  http.setTimeout(8000);
  http.begin(backendUrl + "/capteurs/update");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"salleId\":\"" + salleId
                 + "\",\"temperature\":" + String(temp, 1)
                 + ",\"humidite\":" + String(hum, 0) + "}";

  int code = http.POST(payload);
  if (code > 0) {
    Serial.println("[HTTP] Capteurs OK (" + String(code) + ") " + http.getString());
  } else {
    Serial.println("[HTTP] Erreur capteurs: " + http.errorToString(code));
  }
  http.end();
}

// ─── HTTP : vérification badge ────────────────────────
void verifierBadge(String badgeId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[RFID] WiFi deconnecte");
    rgbBlinkRed(3, 150);
    return;
  }

  HTTPClient http;
  http.setTimeout(8000);
  http.begin(backendUrl + "/acces/verifier");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"badgeId\":\"" + badgeId
                 + "\",\"salleId\":\"" + salleId + "\"}";

  Serial.println("[RFID] POST /acces/verifier → " + payload);
  int code = http.POST(payload);

  if (code > 0) {
    String response = http.getString();
    Serial.println("[RFID] Reponse: " + response);

    if (response.indexOf("\"autorise\":true") != -1) {
      Serial.println("[RFID] ACCES AUTORISE");
      rgbGreen();
      delay(3000);
      rgbOff();
    } else {
      Serial.println("[RFID] ACCES REFUSE");
      rgbRed();
      delay(2000);
      rgbOff();
    }
  } else {
    Serial.println("[HTTP] Erreur serveur: " + http.errorToString(code));
    rgbBlinkRed(3, 150);
  }

  http.end();
  rgbBlue();
}

// ─── WiFi ─────────────────────────────────────────────
bool connecterWiFi() {
  Serial.print("[WiFi] Connexion a ");
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
    Serial.println("[WiFi] Connecte — IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("[WiFi] Echec de connexion");
  return false;
}

// ─── SETUP ────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("  LEONI Control Center — ESP32 IoT");
  Serial.println("========================================");
  Serial.println("Salle   : " + salleId);
  Serial.println("Backend : " + backendUrl);

  pinMode(PIN_RGB_R, OUTPUT);
  pinMode(PIN_RGB_G, OUTPUT);
  pinMode(PIN_RGB_B, OUTPUT);
  rgbOff();

  SPI.begin();
  rfid.PCD_Init();
  Serial.println("[RFID] RC522 pret");

  dht.begin();
  delay(2000);
  Serial.println("[DHT11] Capteur pret");

  if (connecterWiFi()) {
    rgbBlue();
    envoyerCapteurs();
    Serial.println("[RFID] Presentez un badge...\n");
  } else {
    rgbRed();
  }
}

// ─── LOOP ─────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    rgbRed();
    if (!connecterWiFi()) {
      delay(3000);
      return;
    }
    rgbBlue();
  }

  if (millis() - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = millis();
    envoyerCapteurs();
  }

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uidBrut = uidToString(rfid.uid.uidByte, rfid.uid.size);
  String badgeId = normalizeBadgeId(uidBrut);

  Serial.println();
  Serial.println("[RFID] Badge detecte");
  Serial.println("       UID brut : " + uidBrut);
  Serial.println("       Badge ID : " + badgeId);

  verifierBadge(badgeId);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(500);
}
