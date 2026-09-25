const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Yetkili Şifre Güncelleme (Max 50 karakter ve oturum güvenliği ile)
exports.sifreGuncelle = [
    body('mevcut_sifre')
        .notEmpty().withMessage('Mevcut şifre boş olamaz.')
        .isLength({ max: 50 }).withMessage('Mevcut şifre en fazla 50 karakter olmalıdır.'),
    
    body('yeni_sifre')
        .notEmpty().withMessage('Yeni şifre boş olamaz.')
        .isLength({ min: 4, max: 50 }).withMessage('Yeni şifre 4 ile 50 karakter arasında olmalıdır.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        try {
            const kisi_id = req.session.kisi_id;
            const sirket_id = req.session.sirket_id;

            if (!kisi_id || !sirket_id) {
                return res.status(401).json({ success: false, message: 'Oturum yetkisiz. Lütfen tekrar giriş yapın.' });
            }

            const { mevcut_sifre, yeni_sifre } = req.body;

            // 1. Kullanıcının veritabanındaki mevcut şifresini kisi_id ve sirket_id ile doğrula
            const [kullaniciListesi] = await db.execute(
                'SELECT sifre FROM kart_sahip WHERE kisi_id = ? AND sirket_id = ?',
                [kisi_id, sirket_id]
            );

            if (kullaniciListesi.length === 0) {
                return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
            }

            const kayitliSifre = kullaniciListesi[0].sifre;

            // 2. Girilen mevcut şifre doğru mu kontrol et
            if (kayitliSifre !== mevcut_sifre) {
                return res.status(400).json({ success: false, message: 'Girdiğiniz mevcut şifre hatalı!' });
            }

            // 3. Yeni şifreyi veritabanına kaydet
            await db.execute(
                'UPDATE kart_sahip SET sifre = ? WHERE kisi_id = ? AND sirket_id = ?',
                [yeni_sifre, kisi_id, sirket_id]
            );

            return res.json({ success: true, message: 'Şifreniz başarıyla güncellendi.' });

        } catch (error) {
            console.error('Şifre güncelleme hatası:', error);
            return res.status(500).json({ success: false, message: 'Sunucu tarafında hata oluştu.' });
        }
    }
];