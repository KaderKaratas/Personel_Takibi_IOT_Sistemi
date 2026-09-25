const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const izinController = require('../controller/izinController');
const kartController = require('../controller/kartController');
// Sıkı Validasyon Kuralları
const izinValidasyon = [
    body('kisi_id')
        .notEmpty().withMessage('Personel seçimi zorunludur.')
        .isInt().withMessage('Geçersiz personel ID.'),
        
    body('tur')
        .notEmpty().withMessage('Tür seçilmelidir.')
        .isIn(['izin', 'mazeret']).withMessage('Sistem dışı bir tür girilemez.'),
        
    body('baslangic_zaman')
        .notEmpty().withMessage('Başlangıç zamanı zorunludur.')
        // Gelen verinin YYYY-MM-DDTHH:mm formatında olup olmadığını kesin olarak denetler
        .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).withMessage('Lütfen geçerli bir başlangıç tarihi ve saati seçin (Örn: 2026-08-07T08:30).'),
        
    body('bitis_zaman')
        .notEmpty().withMessage('Bitiş zamanı zorunludur.')
        .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).withMessage('Lütfen geçerli bir bitiş tarihi ve saati seçin (Örn: 2026-08-07T17:00).')
];


// Rotalar
router.get('/personeller', kartController.personelListesiGetir);
router.post('/ekle', izinValidasyon, izinController.izinMazeretEkle);
router.post('/sil', izinController.izinSil);
router.get('/liste', izinController.izinMazeretListesiGetir);

module.exports = router;