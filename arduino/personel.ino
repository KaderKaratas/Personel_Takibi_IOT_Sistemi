#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- Wi-Fi ve Sunucu Ayarları ---
const char* ssid = "";        
const char* password = ""; 
const char* serverName = ""; 



// --- Pin Konfigürasyonu ---
// Senin projendeki RX ve TX pinlerini kullanıyoruz
#define RFID_RX D2 
#define RFID_TX D1 
#define BUZZER_PIN D5 
#define I2C_SDA D6
#define I2C_SCL D7

// --- Ekran Ayarları ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1 
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Global Değişkenler ---
SoftwareSerial rfid(RFID_RX, RFID_TX);
String sonOkunanKart = "";
unsigned long sonOkumaZamani = 0;
const unsigned long beklemeSuresi = 20000;
unsigned long ekranSifirlamaZamani = 0;
bool ekranBeklemede = true;

// Ekrana bekleme mesajını yazdıran fonksiyon
void showStandbyScreen() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(25, 12);
  display.println("Lutfen");
  display.setCursor(15, 38);
  display.println("Kart Okut");
  display.display();
  ekranBeklemede = true;
}

// Türkçe karakterleri İngilizce karşılıklarına çeviren fonksiyon
String turkceKarakterleriTemizle(String metin) {
  metin.replace("ç", "c"); metin.replace("Ç", "C");
  metin.replace("ğ", "g"); metin.replace("Ğ", "G");
  metin.replace("ı", "i"); metin.replace("İ", "I");
  metin.replace("ö", "o"); metin.replace("Ö", "O");
  metin.replace("ş", "s"); metin.replace("Ş", "S");
  metin.replace("ü", "u"); metin.replace("Ü", "U");
  return metin;
}

// Sunucuya veriyi gönderip sonucu (true/false) döndüren fonksiyon
bool veriyiSunucuyaGonder(String okunanID, String &gelenAdSoyad) {
  WiFiClient client;
  HTTPClient http;

  bool isSuccess = false;

  http.begin(client, serverName);
  http.addHeader("Content-Type", "application/json");
  String jsonData = "{\"cardId\":\"" + okunanID + "\"}";
  
  Serial.println("Sunucuya veri gonderiliyor...");
  int httpResponseCode = http.POST(jsonData);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Yanit Kodu: ");
    Serial.println(httpResponseCode);

    String response = http.getString();
    
    // HTTP 200 veya 201 (Başarılı) yanıtı geldiyse yetki ver
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      isSuccess = true;
      
      // JSON içinden ad_soyad bilgisini ayıkla
      int startIndex = response.indexOf("\"ad_soyad\":\"");
      if (startIndex != -1) {
        startIndex += 12; 
        int endIndex = response.indexOf("\"", startIndex);
        if (endIndex != -1) {
          gelenAdSoyad = response.substring(startIndex, endIndex);
        }
      }
    }

    Serial.println("Sunucudan Gelen Cevap: " + response);
  }
  else {
    Serial.print("Hata Kodu: ");
    Serial.println(httpResponseCode);
    Serial.println("Sunucuya ulasilamadi!");
  }
  
  http.end();
  return isSuccess;
}

void setup() {
  Serial.begin(115200);
  rfid.begin(9600);
  
  // Buzzer Kurulumu
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // I2C ve OLED Kurulumu
  Wire.begin(I2C_SDA, I2C_SCL);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 OLED baslatilamadi!");
    for(;;);
  }
  
  // Açılış Ekranı
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println("Wi-Fi Baglaniyor...");
  display.display();

  // Wi-Fi Bağlantısı
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  display.clearDisplay();
  display.setCursor(10, 25);
  display.println("Wi-Fi Baglandi!");
  display.println(WiFi.localIP());
  display.display();
  delay(1500);

  // Sistemi bekleme moduna al
  showStandbyScreen();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    return; 
  }

  // RFID Okuma Mantığı
  if (rfid.available() > 0) {
    char c = rfid.read();
    
    if (c == 2) { // RDM6300 Başlangıç bayt'ı
      String cardID = "";
      
      while (true) {
        if (rfid.available() > 0) {
          char nextChar = rfid.read();
          
          if (nextChar == 3) { // RDM6300 Bitiş bayt'ı
            
            // 1. KONTROL: Çift okutma engeli (20 saniye dolmadıysa ve aynı kartsa)
            if (cardID == sonOkunanKart && (millis() - sonOkumaZamani < beklemeSuresi)) {
              // Serial buffer'da biriken çöpleri temizle ve hiç istek atmadan çık
              while(rfid.available() > 0) { rfid.read(); } 
              break; 
            }

            // --- İLK KEZ VEYA SÜRESİ DOLMUŞ KART İŞLEMLERİ ---

            // KRİTİK DÜZELTME: Sunucuya istek atılmadan HEMEN ÖNCE 
            // son okunan kartı ve zamanı güncelliyoruz ki kart üstündeyken 
            // döngü tekrar döndüğünde buraya bir daha girmesin!
            sonOkunanKart = cardID;
            sonOkumaZamani = millis();

            // 2. İşlem başladığını ekranda göster
            display.clearDisplay();
            display.setTextSize(1);
            display.setCursor(10, 25);
            display.println("Sorgulaniyor...");
            display.display();
            ekranBeklemede = false;

            // 3. Node.js API'ye istek at ve sonucu al
            String personelAdi = "";
            bool yetkiliMi = veriyiSunucuyaGonder(cardID, personelAdi);
            
            // 4. Gelen sonuca göre ekranı ve buzzer'ı yönet
            display.clearDisplay();
            if (yetkiliMi) {
              /*display.setTextSize(2);
              display.setCursor(4, 12);
              display.println("Hos Geldin");*/
              
              display.setTextSize(1);
              display.setCursor(15, 45);
              display.println(turkceKarakterleriTemizle(personelAdi)); 
              display.display();

              digitalWrite(BUZZER_PIN, HIGH); delay(80); digitalWrite(BUZZER_PIN, LOW); delay(80);
              digitalWrite(BUZZER_PIN, HIGH); delay(80); digitalWrite(BUZZER_PIN, LOW);
            } else {
              display.setTextSize(2);
              display.setCursor(5, 12);
              display.println("Reddedildi");
              
              display.setTextSize(1);
              display.setCursor(15, 45);
              display.println(cardID);
              display.display();

              digitalWrite(BUZZER_PIN, HIGH); delay(600); digitalWrite(BUZZER_PIN, LOW);
            }

            ekranSifirlamaZamani = millis(); 

            // 5. KRİTİK TEMİZLİK: Kart okuyucu üzerinde tutulurken 
            // serial portta biriken tüm eski verileri siliyoruz.
            delay(200); 
            while(rfid.available() > 0) {
              rfid.read();
            }
            
            break; 
          }
          cardID += nextChar;
        }
      }
    }
  }

  // Kart okutulduktan sonra ekranın açık kalma süresi (3 saniye)
  if (!ekranBeklemede && (millis() - ekranSifirlamaZamani > 3000)) {
    showStandbyScreen();
  }
}

// Ekrana bekleme mesajını yazdıran fonksiyon
/*void showStandbyScreen() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(25, 12);
  display.println("Lutfen");
  display.setCursor(15, 38);
  display.println("Kart Okut");
  display.display();
  ekranBeklemede = true;
}


// Sunucuya veriyi gönderip sonucu (true/false) döndüren fonksiyon
bool veriyiSunucuyaGonder(String okunanID, String &gelenAdSoyad) {
  WiFiClient client;
  HTTPClient http;

  bool isSuccess = false;

  http.begin(client, serverName);
  http.addHeader("Content-Type", "application/json");
  //String jsonData = "{'cardId':'" + okunanID + "'}";
  String jsonData = "{\"cardId\":\"" + okunanID + "\"}";
  
  Serial.println("Sunucuya veri gonderiliyor...");
  int httpResponseCode = http.POST(jsonData);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Yanit Kodu: ");
    Serial.println(httpResponseCode);

    String response = http.getString();
    
    // HTTP 200 veya 201 (Başarılı) yanıtı geldiyse yetki ver
    if (httpResponseCode == 200 || httpResponseCode == 201) {
        isSuccess = true;
      
      // JSON içinden ad_soyad bilgisini ayıkla
      int startIndex = response.indexOf("\"ad_soyad\":\"");
      if (startIndex != -1) {
        startIndex += 12; 
        int endIndex = response.indexOf("\"", startIndex);
        if (endIndex != -1) {
          gelenAdSoyad = response.substring(startIndex, endIndex);
        }
      }
    }

    Serial.println("Sunucudan Gelen Cevap: " + response);
  }
  else {
    Serial.print("Hata Kodu: ");
    Serial.println(httpResponseCode);
    Serial.println("Sunucuya ulasilamadi!");
  }
  
  http.end();
  return isSuccess;
}

void setup() {
  Serial.begin(115200);
  rfid.begin(9600);
  
  // Buzzer Kurulumu
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // I2C ve OLED Kurulumu
  Wire.begin(I2C_SDA, I2C_SCL);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 OLED baslatilamadi!");
    for(;;);
  }
  
  // Açılış Ekranı
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println("Wi-Fi Baglaniyor...");
  display.display();

  // Wi-Fi Bağlantısı
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  display.clearDisplay();
  display.setCursor(10, 25);
  display.println("Wi-Fi Baglandi!");
  display.println(WiFi.localIP());
  display.display();
  delay(1500);

  // Sistemi bekleme moduna al
  showStandbyScreen();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    return; // Bağlantı koptuysa işlem yapma
  }

  // RFID Okuma Mantığı
  if (rfid.available() > 0) {
    char c = rfid.read();
    
    if (c == 2) { // RDM6300 Başlangıç bayt'ı
      String cardID = "";
      
      while (true) {
        if (rfid.available() > 0) {
          char nextChar = rfid.read();
          
          if (nextChar == 3) { // RDM6300 Bitiş bayt'ı
            // Aynı kartın peş peşe okunmasını engelle
            if (!(cardID == sonOkunanKart && (millis() - sonOkumaZamani < beklemeSuresi))) {
               
               // 1. İşlem başladığını ekranda göster
               display.clearDisplay();
               display.setTextSize(1);
               display.setCursor(10, 25);
               display.println("Sorgulaniyor...");
               display.display();
               ekranBeklemede = false;

               // 2. Node.js API'ye istek at ve sonucu al
               String personelAdi = "";
               bool yetkiliMi = veriyiSunucuyaGonder(cardID, personelAdi);
               
               // 3. Gelen sonuca göre ekranı ve buzzer'ı yönet
               display.clearDisplay();
               if (yetkiliMi) {
                 display.setTextSize(2);
                 display.setCursor(4, 12);
                 display.println("Hos Geldin");
                 
                 display.setTextSize(1);
                 display.setCursor(15, 45);
                 display.println(personelAdi); 
                 display.display();

                 // Başarılı (2 kısa bip)
                 digitalWrite(BUZZER_PIN, HIGH); delay(80); digitalWrite(BUZZER_PIN, LOW); delay(80);
                 digitalWrite(BUZZER_PIN, HIGH); delay(80); digitalWrite(BUZZER_PIN, LOW);
               } else {
                 display.setTextSize(2);
                 display.setCursor(5, 12);
                 display.println("Reddedildi");
                 
                 display.setTextSize(1);
                 display.setCursor(15, 45);
                 display.println(cardID);
                 display.display();

                 // Başarısız (1 uzun bip)
                 digitalWrite(BUZZER_PIN, HIGH); delay(600); digitalWrite(BUZZER_PIN, LOW);
               }

               sonOkunanKart = cardID;
               sonOkumaZamani = millis();
               ekranSifirlamaZamani = millis(); 
            }
            break; 
          }
          cardID += nextChar;
        }
      }
    }
  }

  // Kart okutulduktan 2.5 saniye sonra ekranı "Lütfen Kart Okut" moduna geri çevir
  if (!ekranBeklemede && (millis() - ekranSifirlamaZamani > 2500)) {
    showStandbyScreen();
  }
}*/