const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const kartController = require('../controller/kartController');

// Kart Atama İçin Gelişmiş Validasyon Kuralları
const kartAtaValidasyon = [
    // kisi_id sadece tam sayı (integer) olabilir
    body('kisi_id')
        .notEmpty().withMessage('Personel seçimi zorunludur.')
        .isInt().withMessage('Geçersiz personel ID formatı.'),
    
    // rfid_uid boşlamaz, max 50 karakter, SADECE harf ve sayı
    body('rfid_uid')
        .notEmpty().withMessage('RFID Kart Numarası zorunludur.')
        .isString().withMessage('RFID Kart Numarası metin formatında olmalıdır.')
        .trim()
        .isLength({ max: 50 }).withMessage('RFID Kart Numarası en fazla 50 karakter olabilir.')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('RFID Kart Numarası sadece harf ve rakamlardan oluşabilir, sembol veya boşluk içeremez.')
];

// Durum Güncelleme İçin Gelişmiş Validasyon Kuralları
/*const durumGuncelleValidasyon = [
    // kisi_id sadece tam sayı (integer) olabilir
    body('kisi_id')
        .notEmpty().withMessage('Personel seçimi zorunludur.')
        .isInt().withMessage('Geçersiz personel ID formatı.'),
    
    // yeni_durum sadece belirlediğimiz 3 kelimeden biri olabilir, başka bir şey yazılamaz
    body('yeni_durum')
        .notEmpty().withMessage('Yeni durum seçimi zorunludur.')
        .isIn(['Aktif', 'Pasif']).withMessage('Geçersiz durum bilgisi gönderildi, sistem dışı bir kelime kabul edilemez.')
];*/

// Rotalar
router.get('/personeller', kartController.personelListesiGetir);
router.post('/ata', kartAtaValidasyon, kartController.kartAta);
//router.post('/durum-guncelle', durumGuncelleValidasyon, kartController.durumGuncelle);
router.post('/sil', kartController.kartSil);
module.exports = router;