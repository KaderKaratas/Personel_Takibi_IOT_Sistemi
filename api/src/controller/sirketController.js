/*const db = require('../database/db');
const { body, validationResult } = require('express-validator');


// Şirketleri Listeleme
exports.sirketleriGetir = async (req, res) => {
    try {
        const sql = "SELECT * FROM sirket";
        const [results] = await db.execute(sql);
        res.json(results);
    } catch (err) {
        return res.status(500).json({ success: false, message: "Şirketler getirilemedi." });
    }
};

// Yeni Şirket Ekleme (Kontrollü)
exports.sirketEkle = [
    body('sirket_adi').notEmpty().withMessage('Şirket adı boş olamaz.').isLength({ max: 50 }).withMessage('Şirket adı en fazla 50 karakter olmalıdır.'),

    // GÜNCELLEME: Buradaki fonksiyon async yapıldı
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        try {
            const { sirket_adi } = req.body;
            const sql = "INSERT INTO sirket (sirket_adi) VALUES (?)";
            
            // GÜNCELLEME: Callback yerine await db.execute
            const [result] = await db.execute(sql, [sirket_adi]);
            res.json({ success: true, message: "Şirket başarıyla eklendi.", id: result.insertId });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Şirket eklenirken hata oluştu." });
        }
    }
];

// Şirket Silme
exports.sirketSil = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM sirket WHERE sirket_id = ?";
        
        await db.execute(sql, [id]);
        res.json({ success: true, message: "Şirket silindi." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Şirket silinemez (bağlı kayıtlar olabilir)." });
    }
};

// Yeni Kullanıcı / Yetkili Ekleme (Kontrollü)
exports.kullaniciEkle = [
    body('ad').notEmpty().withMessage('Ad boş olamaz.').isLength({ max: 50 }),
    body('soyad').notEmpty().withMessage('Soyad boş olamaz.').isLength({ max: 50 }),
    body('e_posta').isEmail().withMessage('Geçerli bir e-posta adresi giriniz.').isLength({ max: 50 }),
    body('sifre').notEmpty().withMessage('Şifre boş olamaz.').isLength({ max: 50 }),
    body('sirket_id').isInt({ min: 1 }).withMessage('Geçerli bir Şirket ID seçilmelidir.'),
    body('tip_id').isInt({ min: 1, max: 3 }).withMessage('Geçersiz kullanıcı tipi.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        try {
            const { ad, soyad, e_posta, sifre, sirket_id, tip_id } = req.body;
            const sql = `
                INSERT INTO kart_sahip (ad, soyad, e_posta, sifre, sirket_id, tip_id) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const [result] = await db.execute(sql, [ad, soyad, e_posta, sifre, sirket_id, tip_id]);
            res.json({ success: true, message: "Kullanıcı başarıyla kaydedildi.", kisi_id: result.insertId });
            
        } catch (err) {
            console.error("Kullanıcı ekleme hatası:", err);
            return res.status(500).json({ success: false, message: "Kullanıcı veritabanına kaydedilemedi." });
        }
    }
];
// Şirket Parametrelerini Güncelleme (express-validator korumalı, esnek yapı)
exports.sirketParametreGuncelle = [
    body('sirket_id').isInt({ min: 1 }).withMessage('Şirket seçilmelidir.'),
    
    // Regex saat kontrolü kaldırıldı, sadece dolu olması kontrol ediliyor
    body('mesai_giris').notEmpty().withMessage('Mesai giriş saati zorunludur.'),
    body('mesai_cikis').notEmpty().withMessage('Mesai çıkış saati zorunludur.'),
    body('mola_baslangic').notEmpty().withMessage('Mola başlangıç saati zorunludur.'),
    body('mola_bitis').notEmpty().withMessage('Mola bitiş saati zorunludur.'),
    
    // Tolerans alanları sayısal (INT)
    body('tolerans_mesai').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Mesai toleransı negatif olamaz.'),
    body('tolerans_mola').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Mola toleransı negatif olamaz.'),
    body('mola_tolerans_ust_limit').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Üst limit negatif olamaz.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        try {
            const { 
                sirket_id, 
                mesai_giris, 
                mesai_cikis, 
                mola_baslangic, 
                mola_bitis, 
                tolerans_mesai, 
                tolerans_mola, 
                mola_tolerans_ust_limit 
            } = req.body;

            const sql = `
                UPDATE sirket 
                SET mesai_giris = COALESCE(NULLIF(?, ''), mesai_giris), 
                    mesai_cikis = COALESCE(NULLIF(?, ''), mesai_cikis), 
                    mola_baslangic = COALESCE(NULLIF(?, ''), mola_baslangic), 
                    mola_bitis = COALESCE(NULLIF(?, ''), mola_bitis), 
                    tolerans_mesai = COALESCE(NULLIF(?, ''), tolerans_mesai), 
                    tolerans_mola = COALESCE(NULLIF(?, ''), tolerans_mola), 
                    mola_tolerans_ust_limit = COALESCE(NULLIF(?, ''), mola_tolerans_ust_limit)
                WHERE sirket_id = ?
            `;

            await db.execute(sql, [
                mesai_giris || null, 
                mesai_cikis || null, 
                mola_baslangic || null, 
                mola_bitis || null, 
                tolerans_mesai || null, 
                tolerans_mola || null, 
                mola_tolerans_ust_limit || null, 
                sirket_id
            ]);

            res.json({ success: true, message: "Şirket parametreleri başarıyla güncellendi." });
            
        } catch (err) {
            console.error("Parametre güncelleme hatası:", err);
            return res.status(500).json({ success: false, message: "Parametreler güncellenemedi." });
        }
    }
];
// Şirket ID'sine göre parametreleri getirme
exports.sirketParametreGetir = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "SELECT mesai_giris, mesai_cikis, mola_baslangic, mola_bitis, tolerans_mesai, tolerans_mola, mola_tolerans_ust_limit FROM sirket WHERE sirket_id = ?";
        
        const [results] = await db.execute(sql, [id]);
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Şirket bulunamadı." });
        }

        res.json(results[0]);
    } catch (err) {
        console.error("Parametre getirme hatası:", err);
        return res.status(500).json({ success: false, message: "Parametreler getirilemedi." });
    }
}; */
// sirketController.js

const db = require('../database/db'); // Kendi db dosyanız

const sirketAdiRegex = /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]+$/;

exports.sirketKaydetVeyaGuncelle = async (req, res) => {
    try {
        const { 
            sirket_id, sirket_adi, mesai_giris, mesai_cikis, 
            mola_baslangic, mola_bitis, tolerans_mesai, 
            tolerans_mola, mola_tolerans_ust_limit 
        } = req.body;

        if (!sirket_adi || sirket_adi.length > 50) {
            return res.status(400).json({ error: "Şirket adı boş olamaz ve en fazla 50 karakter olmalıdır." });
        }

        if (!sirketAdiRegex.test(sirket_adi)) {
            return res.status(400).json({ error: "Şirket adında sadece harf ve rakam kullanılabilir. Özel karakterlere izin verilmez." });
        }

        if (sirket_id) {
            // Tablo adı "sirket" olarak düzeltildi
            const guncelleSorgu = `
                UPDATE sirket 
                SET sirket_adi = ?, mesai_giris = ?, mesai_cikis = ?, 
                    mola_baslangic = ?, mola_bitis = ?, tolerans_mesai = ?, 
                    tolerans_mola = ?, mola_tolerans_ust_limit = ?
                WHERE sirket_id = ?
            `;
            await db.execute(guncelleSorgu, [
                sirket_adi, mesai_giris, mesai_cikis, mola_baslangic, 
                mola_bitis, tolerans_mesai, tolerans_mola, mola_tolerans_ust_limit, sirket_id
            ]);
            
            res.status(200).json({ message: "Şirket parametreleri başarıyla güncellendi." });
        } else {
            // Tablo adı "sirket" olarak düzeltildi
            const ekleSorgu = `
                INSERT INTO sirket 
                (sirket_adi, mesai_giris, mesai_cikis, mola_baslangic, mola_bitis, tolerans_mesai, tolerans_mola, mola_tolerans_ust_limit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await db.execute(ekleSorgu, [
                sirket_adi, mesai_giris, mesai_cikis, mola_baslangic, 
                mola_bitis, tolerans_mesai, tolerans_mola, mola_tolerans_ust_limit
            ]);

            res.status(201).json({ message: "Yeni şirket ve parametreleri başarıyla eklendi." });
        }
    } catch (error) {
        console.error("Veritabanı hatası:", error);
        res.status(500).json({ error: "İşlem sırasında sunucu hatası oluştu." });
    }
};

exports.sirketleriGetir = async (req, res) => {
    try {
        // Tablo adı "sirket" olarak düzeltildi
        const [sirketler] = await db.execute("SELECT * FROM sirket ORDER BY sirket_id DESC");
        res.status(200).json(sirketler);
    } catch (error) {
        console.error("Listeleme hatası:", error);
        res.status(500).json({ error: "Şirketler listelenirken hata oluştu." });
    }
};

exports.sirketSil = async (req, res) => {
    try {
        const { id } = req.params;
        // Tablo adı "sirket" olarak düzeltildi
        await db.execute("DELETE FROM sirket WHERE sirket_id = ?", [id]);
        res.status(200).json({ message: "Şirket başarıyla silindi." });
    } catch (error) {
        console.error("Silme hatası:", error);
        res.status(500).json({ error: "Silme işlemi başarısız oldu." });
    }
};
// --- YETKİLİ VE PERSONEL İŞLEMLERİ ---

// 1. Şirkete ait personelleri getir (Yetkililer üstte olacak şekilde sıralı)
exports.sirketPersonelleriniGetir = async (req, res) => {
    try {
        const { sirket_id } = req.params;
        const sorgu = `
            SELECT * FROM kart_sahip 
            WHERE sirket_id = ? 
            ORDER BY tip_id DESC, kisi_id DESC
        `;
        const [personeller] = await db.execute(sorgu, [sirket_id]);
        res.status(200).json(personeller);
    } catch (error) {
        console.error("Personel listeleme hatası:", error);
        res.status(500).json({ error: "Personeller getirilirken hata oluştu." });
    }
};

// 2. Yetkili / Personel Kaydet veya Güncelle (Güvenlik Korumalı)
const adSoyadRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
const epostaRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.yetkiliKaydetVeyaGuncelle = async (req, res) => {
    try {
        const { kisi_id, ad, soyad, e_posta, sifre, tip_id, sirket_id } = req.body;

        // GÜVENLİK KONTROLLERİ (DevTools bypass koruması)
        if (!ad || !soyad || !e_posta || !tip_id || !sirket_id) {
            return res.status(400).json({ error: "Tüm alanlar doldurulmalıdır!" });
        }

        // Şifre boş veya sadece boşluksa NULL yap, doluysa şifreyi al
        const sifreDegeri = (sifre && sifre.trim() !== "") ? sifre : null;

        if (!adSoyadRegex.test(ad) || !adSoyadRegex.test(soyad)) {
            return res.status(400).json({ error: "Ad ve soyad alanlarında sadece harf kullanılabilir!" });
        }

        if (!epostaRegex.test(e_posta)) {
            return res.status(400).json({ error: "Geçersiz e-posta formatı!" });
        }

        if (kisi_id) {
            // GÜNCELLEME (UPDATE)
            const guncelleSorgu = `
                UPDATE kart_sahip 
                SET ad = ?, soyad = ?, e_posta = ?, sifre = ?, tip_id = ?
                WHERE kisi_id = ? AND sirket_id = ?
            `;
            await db.execute(guncelleSorgu, [ad, soyad, e_posta, sifreDegeri, tip_id, kisi_id, sirket_id]);
            res.status(200).json({ message: "Personel/Yetkili bilgileri başarıyla güncellendi." });
        } else {
            // YENİ KAYIT (INSERT) - Kesinlikle seçilen şirkete bağlanır
            const ekleSorgu = `
                INSERT INTO kart_sahip (ad, soyad, e_posta, sifre, tip_id, sirket_id, durum)
                VALUES (?, ?, ?, ?, ?, ?, 'Aktif')
            `;
            await db.execute(ekleSorgu, [ad, soyad, e_posta, sifreDegeri, tip_id, sirket_id]);
            res.status(201).json({ message: "Yeni yetkili/personel başarıyla eklendi." });
        }
    } catch (error) {
        console.error("Yetkili kayıt hatası:", error);
        res.status(500).json({ error: "İşlem sırasında sunucu hatası oluştu." });
    }
};