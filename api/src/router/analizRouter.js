const express = require('express');
const router = express.Router();
const analizController = require('../controller/analizController'); 

// Frontend'den gelen istekleri karşılayacak tek rota
router.get('/api/analiz/giris-cikis', analizController.getGirisCikisAnaliz);
// YENİ EKLENECEK ROTA (Filtreye kişileri doldurmak için)
router.get('/api/analiz/kisiler', analizController.getSirketKisileri);
module.exports = router;