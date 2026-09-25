const { validationResult } = require('express-validator');
const db = require('../database/db');

// Yetkilinin şirketindeki personelleri getir (Arama ve seçme için)
/*exports.personelListesiGetir = async (req, res) => {
    try {
        const sirket_id = req.session.sirket_id;
        if (!sirket_id) return res.status(401).json({ success: false, message: 'Oturum yetkisiz.' });

        const query = 'SELECT kisi_id, ad, soyad, durum FROM kart_sahip WHERE sirket_id = ?';
        
        // GÜNCELLEME: Callback yapısı silindi, yerine await db.execute kullanıldı
        const [results] = await db.execute(query, [sirket_id]);
        
        return res.status(200).json({ success: true, data: results });
        
    } catch (error) {
        // Hatalar otomatik olarak bu bloğa düşer
        console.error('Personel listesi hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
}; */
exports.izinMazeretListesiGetir = async (req, res) => {
    try {
        const sirket_id = req.session.sirket_id;
        if (!sirket_id) return res.status(401).json({ success: false, message: 'Oturum yetkisiz.' });

        const query = `
            SELECT 
                im.id AS izin_id, 
                p.kisi_id, 
                p.ad, 
                p.soyad, 
                im.tur AS tur, 
                im.baslangic_zaman AS baslangic_zaman, 
                im.bitis_zaman AS bitis_zaman 
            FROM izin_mazeret im
            INNER JOIN kart_sahip p ON im.kisi_id = p.kisi_id
            WHERE p.sirket_id = ?
            ORDER BY im.baslangic_zaman DESC
        `;
        
        const [results] = await db.execute(query, [sirket_id]);
        return res.status(200).json({ success: true, data: results });
        
    } catch (error) {
        console.error('İzin listesi getirme hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
};

exports.izinMazeretEkle = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const {
            izin_kayit_id,
            kisi_id,
            tur,
            baslangic_zaman,
            bitis_zaman
        } = req.body;

        // DÜZENLEME
        if (izin_kayit_id) {

            const query = `
                UPDATE izin_mazeret
                SET
                    kisi_id = ?,
                    tur = ?,
                    baslangic_zaman = ?,
                    bitis_zaman = ?
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [
                kisi_id,
                tur,
                baslangic_zaman,
                bitis_zaman,
                izin_kayit_id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Güncellenecek izin/mazeret kaydı bulunamadı.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'İzin/Mazeret başarıyla güncellendi.'
            });
        }

        // YENİ KAYIT
        const query = `
            INSERT INTO izin_mazeret
            (kisi_id, tur, baslangic_zaman, bitis_zaman)
            VALUES (?, ?, ?, ?)
        `;

        await db.execute(query, [
            kisi_id,
            tur,
            baslangic_zaman,
            bitis_zaman
        ]);

        return res.status(200).json({
            success: true,
            message: 'İzin/Mazeret başarıyla kaydedildi.'
        });

    } catch (error) {
        console.error('İzin ekleme/güncelleme hatası:', error);

        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası.'
        });
    }
};
// İzin / Mazeret Silme İşlemi
exports.izinSil = async (req, res) => {
    try {
        const { izin_id } = req.body;
        
        if (!izin_id) {
            return res.status(400).json({ success: false, message: 'Silinecek kayıt ID belirtilmedi.' });
        }

        // İzin/Mazeret tablosunun PK'si id olduğu için ona göre siliyoruz
        const query = 'DELETE FROM izin_mazeret WHERE id = ?';
        
        await db.execute(query, [izin_id]);
        
        return res.status(200).json({ success: true, message: 'İzin/Mazeret kaydı başarıyla silindi.' });
        
    } catch (error) {
        console.error('İzin silme hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
};