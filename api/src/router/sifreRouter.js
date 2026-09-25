const express = require('express');
const router = express.Router();
const sifreController = require('../controller/sifreController');

// Yetkili şifre değiştirme endpoint'i
router.post('/sifre-guncelle', sifreController.sifreGuncelle);

module.exports = router;