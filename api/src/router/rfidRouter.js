const express = require('express');
const router = express.Router();
const rfidController = require('../controller/rfidController');

// Ana sunucuda '/api/rfid' olarak tanımlayacağımız için burada sadece '/' kullanıyoruz
router.post('/', rfidController.kartOku);

module.exports = router;