# IoT Tabanlı Personel Devam Kontrol Sistemi (PDKS)

Bu proje, donanım (NodeMCU) ve yazılım (Node.js & MySQL) bileşenlerinin entegre çalıştığı, uçtan uca bir akıllı personel takip ve yönetim sistemidir. Sistem, RFID kart okumaları üzerinden personelin giriş-çıkış saatlerini kaydederken, entegre sensörler ile ortam güvenliğini de takip eder.

## 🚀 Temel Özellikler

- **Akıllı Kart Okuma:** RDM6300 RFID modülü ile personellerin sisteme hızlı ve güvenli şekilde kaydedilmesi.
- **Güvenlik ve İzleme:** MQ2 gaz sensörü ile ortamdaki gaz kaçaklarının tespiti ve OLED ekran ile buzzer üzerinden anlık geri bildirimler.
- **RESTful API Mimarisi:** Node.js ve Express framework kullanılarak geliştirilmiş, MVC yapısına uygun (Router & Controller) modüler API altyapısı.
- **Veri Kaydı ve Analizi:** Kart verilerinin MySQL veritabanına `GIRIS` ve `CIKIS` statüleri ile anlık olarak işlenmesi.
- **Yetkili Yönetim Paneli:** HTML, CSS ve Vanilla JS ile tasarlanmış arayüz üzerinden personel yönetimi, kart atama, izin/mazeret işlemleri ve Chart.js destekli analiz grafikleri.

## 🛠️ Kullanılan Teknolojiler

### Donanım (IoT)
- NodeMCU ESP8266
- RDM6300 RFID Okuyucu Modülü
- MQ2 Gaz Sensörü
- SSD1306 OLED Ekran
- Buzzer

### Yazılım & Backend
- **Backend:** Node.js, Express.js
- **Veritabanı:** MySQL
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Veri Görselleştirme:** Chart.js, Power BI
- **Geliştirme Araçları:** Arduino IDE, VS Code, MySQL Workbench

## 📂 Veritabanı Yapısı

Sistem performansı ve bütünlüğü için tablolar standart isimlendirme kurallarına (örneğin `personeltakip`, `giriscikis` şeklinde alt tire olmadan) uygun tasarlanmıştır. Personel hareketleri `GIRIS` ve `CIKIS` enum değerleri ile kontrol edilmektedir. Veritabanı kurulum scriptleri `database/` klasörü içerisinde `personel_takibi.sql` dosyasında mevcuttur.

## ⚙️ Kurulum ve Çalıştırma

### 1. Veritabanı Kurulumu
* `database/personel_takibi.sql` dosyasını MySQL Workbench üzerinden çalıştırarak gerekli tabloları oluşturun.
* `api/src/database/db.js` dosyası içindeki veritabanı bağlantı ayarlarını kendi yerel MySQL sunucunuza göre güncelleyin.

### 2. API Kurulumu
Terminal üzerinden `api` klasörüne gidin ve bağımlılıkları yükleyip sunucuyu başlatın:
```bash
cd api
npm install
npm start