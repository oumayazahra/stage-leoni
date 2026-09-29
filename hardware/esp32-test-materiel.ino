// =====================================================
// LEONI — TEST MATÉRIEL LOCAL (sans WiFi / sans backend)
// =====================================================
// Phase 1 : valider le câblage AVANT de connecter l'IoT
//
// Ce sketch teste séparément :
//   1. LED RGB (anode commune)
//   2. Capteur DHT11
//   3. Lecteur RFID RC522
//
// Câblage identique au projet final :
//   RC522 SDA→5, RST→22 | DHT11 DATA→4
//   RGB R→13, G→12, B→2, COM→3.3V
// =====================================================

#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>

#define PIN_RFID_SS   5
#define PIN_RFID_RST  22
#define PIN_DHT       4
#define DHTTYPE       DHT11

#define PIN_RGB_R  13
#define PIN_RGB_G  12
#define PIN_RGB_B  2

MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
DHT dht(PIN_DHT, DHTTYPE);

// Badge autorisé pour le test local (UID affiché dans le moniteur série)
// Remplacez par l'UID de VOTRE carte après le 1er scan
String badgeAutorise = "REMPLACER_PAR_VOTRE_UID";

unsigned long lastDhtMs = 0;
const unsigned long DHT_INTERVAL_MS = 3000;

// ─── LED RGB anode commune ────────────────────────────
void setRgb(bool r, bool g, bool b) {
  digitalWrite(PIN_RGB_R, r ? LOW : HIGH);
  digitalWrite(PIN_RGB_G, g ? LOW : HIGH);
  digitalWrite(PIN_RGB_B, b ? LOW : HIGH);
}

void rgbOff()   { setRgb(false, false, false); }
void rgbRed()   { setRgb(true,  false, false); }
void rgbGreen() { setRgb(false, true,  false); }
void rgbBlue()  { setRgb(false, false, true);  }

// ─── Test 1 : séquence couleurs au démarrage ──────────
void testLedRgb() {
  Serial.println("\n[TEST 1] LED RGB — séquence R → G → B");
  rgbRed();   delay(800);
  rgbGreen(); delay(800);
  rgbBlue();  delay(800);
  rgbOff();
  Serial.println("[TEST 1] OK — vous avez vu Rouge, Vert, Bleu ?");
}

String uidToString(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("  LEONI — TEST MATERIEL (Phase 1)");
  Serial.println("  Pas de WiFi | Pas de backend");
  Serial.println("========================================");

  pinMode(PIN_RGB_R, OUTPUT);
  pinMode(PIN_RGB_G, OUTPUT);
  pinMode(PIN_RGB_B, OUTPUT);
  rgbOff();

  SPI.begin();
  rfid.PCD_Init();
  dht.begin();
  delay(2000);

  testLedRgb();

  Serial.println("\n[TEST 2] DHT11 — lecture toutes les 3 s");
  Serial.println("[TEST 3] RFID — presentez une carte devant le lecteur");
  Serial.println("         → Vert si UID autorise, Rouge sinon");
  Serial.println("         → Copiez l'UID affiche pour badgeAutorise");
  Serial.println("\nEn attente...\n");

  rgbBlue();
}

void loop() {
  // ─── Test DHT11 périodique ──────────────────────────
  if (millis() - lastDhtMs >= DHT_INTERVAL_MS) {
    lastDhtMs = millis();
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("[DHT11] ERREUR — verifiez DATA sur GPIO 4");
    } else {
      Serial.printf("[DHT11] OK — Temp: %.1f C | Hum: %.0f %%\n", temp, hum);
    }
  }

  // ─── Test RFID ──────────────────────────────────────
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = uidToString(rfid.uid.uidByte, rfid.uid.size);

  Serial.println();
  Serial.println("[RFID] Carte detectee !");
  Serial.println("       UID = " + uid);
  Serial.println("       → Copiez cet UID dans badgeAutorise pour simuler l'autorisation");

  if (badgeAutorise == "REMPLACER_PAR_VOTRE_UID") {
    Serial.println("[RFID] badgeAutorise non configure — LED bleue clignote");
    rgbBlue(); delay(300); rgbOff(); delay(300);
    rgbBlue();
  } else if (uid == badgeAutorise) {
    Serial.println("[RFID] ACCES AUTORISE (test local)");
    rgbGreen();
    delay(2000);
    rgbBlue();
  } else {
    Serial.println("[RFID] ACCES REFUSE (test local)");
    rgbRed();
    delay(2000);
    rgbBlue();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(500);
}
