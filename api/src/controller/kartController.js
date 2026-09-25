const { validationResult } = require('express-validator');
const db = require('../database/db'); // Veritabanı bağlantı dosyan

// 1. Yetkilinin Şirketine Ait Personelleri Listeleme (Arayüzdeki kutuları doldurmak için)
exports.personelListesiGetir = async (req, res) => {
    try {
        const sirket_id = req.session.sirket_id;
        
        if (!sirket_id) {
            return res.status(401).json({ success: false, message: 'Oturum yetkisiz. Lütfen tekrar giriş yapın.' });
        }

        // GÜNCELLEME: kartlar tablosu LEFT JOIN ile eklendi.
       const query = `
        SELECT p.kisi_id, p.ad, p.soyad, p.durum, k.rfid_uid 
        FROM kart_sahip p 
        LEFT JOIN kartlar k ON p.kisi_id = k.kisi_id 
        WHERE p.sirket_id = ?
    `;
        
        const [results] = await db.execute(query, [sirket_id]);
        return res.status(200).json({ success: true, data: results });
        
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
};

// 2. Seçilen Personele Kart Atama İşlemi
exports.kartAta = async (req, res) => {
    // Validasyon hatalarını kontrol et
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { kisi_id, rfid_uid } = req.body;
        
        const query = 'INSERT INTO kartlar (rfid_uid, kisi_id) VALUES (?, ?)';
        
        // GÜNCELLEME: Callback silindi, veri doğrudan eklendi
        await db.execute(query, [rfid_uid, kisi_id]);
        
        return res.status(200).json({ success: true, message: 'Kart başarıyla personele atandı.' });
        
    } catch (error) {
        // GÜNCELLEME: Çift kayıt (Duplicate Entry) hatası doğrudan catch bloğuna düşüyor
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Bu kart zaten başka birine kayıtlı!' });
        }
        
        console.error('Kart atama hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }

};
// 3. Seçilen Personelin Kartını Silme İşlemi
exports.kartSil = async (req, res) => {
    try {
        const { kisi_id } = req.body;
        
        if (!kisi_id) {
            return res.status(400).json({ success: false, message: 'Personel ID belirtilmedi.' });
        }

        const query = 'DELETE FROM kartlar WHERE kisi_id = ?';
        
        // Veritabanından o kisi_id'ye ait kart kaydını siliyoruz
        await db.execute(query, [kisi_id]);
        
        return res.status(200).json({ success: true, message: 'Kart başarıyla silindi.' });
        
    } catch (error) {
        console.error('Kart silme hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
};
