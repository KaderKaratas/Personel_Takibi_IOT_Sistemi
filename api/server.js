const express = require('express');
const session = require('express-session');
const path = require('path');

// Yönlendiriciler (Routers)
const authRouter = require('./src/router/authRouter');
const rfidRouter = require('./src/router/rfidRouter'); // Donanım yönlendiricisini ekledik

const sirketRouter = require('./src/router/sirketRouter');
const personelRouter = require('./src/router/personelRouter');
const kartRouter = require('./src/router/kartRouter');
const izinRouter = require('./src/router/izinRouter');
const sifreRouter = require('./src/router/sifreRouter');
const analizRouter = require('./src/router/analizRouter');



const app = express();

// Ayarlar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Oturum Yönetimi
app.use(session({
    secret: 'guvenli_sistem_anahtari', 
    resave: false,  //true olsaydı her istekte session'ı yeniden kaydederdi, false ise sadece değişiklik olduğunda kaydeder
    saveUninitialized: false, //true olsaydı oturum başlatılmamış kullanıcılar için de session oluştururdu, false ise sadece oturum başlatıldığında oluşturur   
    cookie: { 
        maxAge: 1000 * 60 * 20 // 20 Dakika (Milisaniye cinsinden)
    }
}));

// API Uç Noktaları
app.use('/api/sirketler', sirketRouter);// 2. /api/sirket ile başlayan istekleri bu router'a yönlendir
app.use('/api/auth', authRouter); // Web paneli giriş işlemleri
app.use('/api/rfid', rfidRouter); // NodeMCU kart okuma işlemleri

//personel ekleme işlemleri için router'ı ekliyoruz
app.use('/api/personeller', personelRouter);

//kart işlemleri için router'ı ekliyoruz
app.use('/api/kart', kartRouter);

//izin işlemleri için router'ı ekliyoruz
app.use('/api/izin', izinRouter);

app.use('/api/sifre', sifreRouter);

// Analiz API isteklerini yönlendirme
app.use('/', analizRouter);



// Tarayıcının sorguladığı /api/oturum-kontrol adresi için rota:
app.get('/api/oturum-kontrol', (req, res) => {
    if (req.session && req.session.sirket_id) {
        return res.json({ authenticated: true });
    }
    return res.json({ authenticated: false });
});

// Sunucuyu Başlat
const PORT = 8080;
const server = app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log(`Sunucu basariyla baslatildi.`);
    console.log(`Web Paneli: http://localhost:${PORT}/login.html`);
    console.log("ESP8266'dan veri bekleniyor...");
    console.log("-----------------------------------");
});

// Hata Yakalama (Eski kodundan taşıdık)
server.on('error', (error) => {
    console.error("\n!!! SUNUCU BASLATILAMADI !!!");
    console.error("Hata Detayı:", error.message);
    console.error("-----------------------------------\n");
});