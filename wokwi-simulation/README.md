# Simulation Wokwi – Leoni Server Room IoT

## ⚡ Circuit Wokwi vs Matériel Réel

| Composant | Matériel Réel | Wokwi |
|-----------|--------------|-------|
| **Carte** | ESP32 DevKit | ESP32 DevKit ✅ identique |
| **Lecteur RFID** | RC522 (SPI) | RC522 (SPI) ✅ identique |
| **Capteur Temp/Hum** | DHT22 (GPIO 5) | DHT22 (GPIO 5) ✅ identique |
| **LED Verte** | GPIO 12 + 220Ω | GPIO 12 + 220Ω ✅ identique |
| **LED Rouge** | GPIO 13 + 220Ω | GPIO 13 + 220Ω ✅ identique |
| **Relais porte** | Module relais GPIO 2 | Simulé par LED verte |
| **WiFi** | Réseau local réel | `Wokwi-GUEST` |

> **Le câblage, les pins et le code sont les mêmes.**
> Pour passer au matériel réel, il suffit de changer le SSID WiFi et l'URL du backend.

---

## 🔌 Câblage SPI (RFID RC522 → ESP32)

| RC522 | ESP32 | Rôle |
|-------|-------|------|
| SDA | GPIO 4 | Chip Select |
| SCK | GPIO 18 | Clock SPI |
| MOSI | GPIO 23 | Master Out |
| MISO | GPIO 19 | Master In |
| RST | GPIO 22 | Reset |
| 3.3V | 3V3 | Alimentation |
| GND | GND | Masse |

---

## 🚀 Comment utiliser

### Étape 1 – Ouvrir le projet dans Wokwi
1. Allez sur **https://wokwi.com** → **New Project** → **ESP32**
2. Remplacez le contenu de `sketch.ino` par le fichier [sketch.ino](file:///c:/Users/zahra/OneDrive/Bureau/stage-leoni/wokwi-simulation/sketch.ino)
3. Cliquez sur l'onglet `diagram.json` et collez le contenu de [diagram.json](file:///c:/Users/zahra/OneDrive/Bureau/stage-leoni/wokwi-simulation/diagram.json)

### Étape 2 – Configurer les badges RFID dans Wokwi
Dans Wokwi, cliquez sur le lecteur RFID puis sur le **tag RFID** pour simuler un scan.
Vous pouvez configurer l'UID du tag. Utilisez ces UIDs pour correspondre aux badges du backend :

| Badge Backend | UID du tag Wokwi (hex) |
|---------------|----------------------|
| `A1B2C3` (Manager) | `A1:B2:C3:00` |
| `D4E5F6` (Support Salle A) | `D4:E5:F6:00` |
| `789XYZ` (Support Salle B) | Configurer le tag avec UID `78:9X:YZ:00` ou ajouter le badge dans le dashboard |

### Étape 3 – Connecter au backend

**Option A – Wokwi for VS Code (recommandé)**
L'extension VS Code permet à la simulation d'accéder directement à `localhost:5000`.
```
backendUrl = "http://localhost:5000/api"  // ← fonctionne tel quel
```

**Option B – Wokwi en ligne + ngrok**
```bash
ngrok http 5000
```
Puis changez dans le sketch :
```cpp
String backendUrl = "https://votre-url.ngrok-free.app/api";
```

### Étape 4 – Lancer !
1. Assurez-vous que le backend tourne (`node server.js`)
2. Cliquez **▶ Start** dans Wokwi
3. Observez le moniteur série pour les logs
4. Cliquez sur le **lecteur RFID** → **tag** pour scanner un badge
5. La **LED verte** s'allume si autorisé, **LED rouge** si refusé
6. L'accès est enregistré dans l'**historique** de l'application web

### Modifier la température/humidité
Dans Wokwi, cliquez directement sur le **capteur DHT22** pour ajuster les valeurs.
Mettez la température au-dessus de **28°C** pour déclencher une alerte sur le dashboard.

---

## 🔄 Passage au Matériel Réel

Le code est le même. Les seules modifications :

```cpp
// 1. Changer le WiFi
const char* ssid     = "VOTRE_WIFI";
const char* password = "VOTRE_MOT_DE_PASSE";

// 2. Changer l'URL du backend (IP de votre PC sur le réseau local)
String backendUrl = "http://192.168.1.XX:5000/api";

// 3. Ajouter le relais (GPIO 2) – déjà prévu dans ESP32_INTEGRATION.md
```

Le reste (SPI, RFID, DHT22, LEDs) fonctionne exactement pareil.
