const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const personelController = require('../controller/personelController');

// Personel Ekleme Kontrolleri
const personelEkleValidasyon = [
    body('ad')
        .notEmpty().withMessage('Ad alanı boş bırakılamaz.')
        .isString().withMessage('Ad metin formatında olmalıdır.')
        .trim()
        .isLength({ max: 50 }).withMessage('Ad en fazla 50 karakter olabilir.')
        .matches(/^[^0-9]*$/).withMessage('Ad alanı sayı içeremez.'),
    
    body('soyad')
        .notEmpty().withMessage('Soyad alanı boş bırakılamaz.')
        .isString().withMessage('Soyad metin formatında olmalıdır.')
        .trim()
        .isLength({ max: 50 }).withMessage('Soyad en fazla 50 karakter olabilir.')
        .matches(/^[^0-9]*$/).withMessage('Soyad alanı sayı içeremez.'),
    
    body('e_posta')
        .notEmpty().withMessage('E-posta alanı boş bırakılamaz.')
        .isEmail().withMessage('Geçerli bir e-posta adresi giriniz.')
        .normalizeEmail()
        .isLength({ max: 50 }).withMessage('E-posta en fazla 50 karakter olabilir.'),
    
    body('durum')
        .notEmpty().withMessage('Durum alanı boş bırakılamaz.')
        .isString().withMessage('Durum metin formatında olmalıdır.')
        .trim()
        .isLength({ max: 20 }).withMessage('Durum en fazla 20 karakter olabilir.')
];
// Mevcut router tanımlamalarının altına ekle:
router.get('/liste', personelController.personelListele);
router.post('/guncelle', personelController.personelGuncelle);
router.post('/durum-degistir', personelController.durumDegistir);

// POST İsteği Geldiğinde Çalışacak Rota
router.post('/ekle', personelEkleValidasyon, personelController.personelEkle);

module.exports = router;