const { validationResult } = require('express-validator');
const db = require('../database/db'); 

// 1. Personel Ekleme
const personelEkle = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { ad, soyad, e_posta, durum } = req.body;
        
        const sirket_id = req.session.sirket_id; 
        const yetkili_tip_id = req.session.tip_id; 
        
        if (!sirket_id || yetkili_tip_id !== 2) {
            return res.status(403).json({ 
                success: false, 
                message: 'Yetkisiz işlem! Bu işlemi sadece şirket yetkilileri yapabilir.' 
            });
        }

        const eklenecek_personel_tip_id = 1; 
        
        const query = `
            INSERT INTO kart_sahip (ad, soyad, e_posta, durum, sirket_id, tip_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(query, [
            ad, 
            soyad, 
            e_posta, 
            durum, 
            sirket_id, 
            eklenecek_personel_tip_id 
        ]);

        return res.status(201).json({ 
            success: true, 
            message: 'Personel sisteme başarıyla eklendi.' 
        });

    } catch (error) {
        console.error('Personel eklenirken hata oluştu:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
}; 

// 2. Personelleri Listele
const personelListele = async (req, res) => {
    try {
        const sirket_id = req.session.sirket_id; 
        if (!sirket_id) {
            return res.status(401).json({ success: false, message: "Oturum süresi dolmuş, lütfen tekrar giriş yapın." });
        }
        const [personeller] = await db.execute(
            'SELECT kisi_id, ad, soyad, e_posta, durum FROM kart_sahip WHERE sirket_id = ?', 
            [sirket_id]
        );
        return res.json({ success: true, data: personeller });
    } catch (err) {
        console.error("Listeleme Hatası:", err);
        return res.status(500).json({ success: false, message: "Personeller listelenemedi." });
    }
};

// 3. Formdan Ad, Soyad, E-Posta Güncelleme
const personelGuncelle = async (req, res) => {
    try {
        const { kisi_id, ad, soyad, e_posta, durum } = req.body;
        await db.execute(
            'UPDATE kart_sahip SET ad = ?, soyad = ?, e_posta = ?, durum = ? WHERE kisi_id = ?',
            [ad, soyad, e_posta, durum, kisi_id]
        );
        return res.json({ success: true, message: "Personel bilgileri güncellendi." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Güncelleme başarısız." });
    }
};

// 4. Tablodan Tek Tıkla Durum (Aktif/Pasif) Değiştirme
const durumDegistir = async (req, res) => {
    try {
        const { kisi_id, yeni_durum } = req.body; 
        await db.execute(
            'UPDATE kart_sahip SET durum = ? WHERE kisi_id = ?',
            [yeni_durum, kisi_id]
        );
        return res.json({ success: true, message: "Durum güncellendi." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Durum değiştirilemedi." });
    }
};

// Hepsini doğru şekilde dışa aktarıyoruz
module.exports = {
    personelEkle,
    personelListele,
    personelGuncelle,
    durumDegistir
};