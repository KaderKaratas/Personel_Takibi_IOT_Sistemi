/*const express = require('express');
const router = express.Router();
const sirketController = require('../controller/sirketController');

// Şirket İşlemleri Rotaları
router.get('/liste', sirketController.sirketleriGetir);
router.post('/ekle', sirketController.sirketEkle);
router.delete('/sil/:id', sirketController.sirketSil);

//sirket yetkili ekleme rotası
router.post('/kullanici-ekle', sirketController.kullaniciEkle);

// Şirket Parametrelerini Güncelleme Rotası
router.put('/parametre-guncelle', sirketController.sirketParametreGuncelle);

router.get('/parametre/:id', sirketController.sirketParametreGetir);

module.exports = router;//router paketlerini dışarıya aktardık ki server.js dosyasında kullanabilelim. */
// sirketRouter.js
const express = require('express');
const router = express.Router();
const sirketController = require('../controller/sirketController'); 

// sirket ekleme ve parametreler:Router yolları
router.get('/', sirketController.sirketleriGetir);
router.post('/kaydet', sirketController.sirketKaydetVeyaGuncelle);
router.delete('/:id', sirketController.sirketSil);

// Yetkili atama 
router.post('/yetkili-kaydet', sirketController.yetkiliKaydetVeyaGuncelle);
router.get('/:sirket_id/personeller', sirketController.sirketPersonelleriniGetir);


module.exports = router;