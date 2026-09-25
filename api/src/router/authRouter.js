const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');


// /login adresine POST isteği gelirse, authController içindeki login fonksiyonunu çalıştır
router.post('/login', authController.login);

module.exports = router;