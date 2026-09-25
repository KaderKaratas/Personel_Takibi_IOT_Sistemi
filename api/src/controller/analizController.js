const db = require('../database/db');

exports.getSirketKisileri = async (req, res) => {
    try {
        const sirketId = req.session.sirket_id;
        if (!sirketId) return res.status(401).json({ success: false });

        const [kisiler] = await db.query('SELECT kisi_id, ad, soyad FROM kart_sahip WHERE sirket_id = ?', [sirketId]);

        // KVKK Maskeleme Fonksiyonu (Controller İçerisinde)
        /*const maskele = (metin) => {
            if (!metin) return '';
            return String(metin).trim().split(/\s+/).map(kelime => {
                if (kelime.length <= 2) return kelime;
                return kelime.substring(0, 2) + '*'.repeat(Math.max(0, kelime.length - 2));
            }).join(' ');
        };*/
        const maskele = (metin) => {
        if (!metin) return '';
        return String(metin).trim().split(/\s+/).map(kelime => {
            // Kelimenin uzunluğu ne olursa olsun, ilk 2 harfi alıp sonuna *** ekler
            return kelime.substring(0, 2) + '***';
        }).join(' ');
    };

        // Veritabanından gelen listeyi maskeleyerek güvenli bir dizi oluşturuyoruz
        const guvenliKisiler = kisiler.map(kisi => {
            return {
                kisi_id: kisi.kisi_id,
                ad: maskele(kisi.ad),
                soyad: maskele(kisi.soyad)
            };
        });

        // Tarayıcıya SADECE maskelenmiş veriler gidiyor
        res.json({ success: true, data: guvenliKisiler });
    } catch (err) {
        console.error("Kişi çekme hatası:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getGirisCikisAnaliz = async (req, res) => {
    try {
        const sirketId = req.session.sirket_id;
        if (!sirketId) return res.status(401).json({ success: false });

        const yil = req.query.yil || new Date().getFullYear(); 
        const ay = req.query.ay || (new Date().getMonth() + 1); 
        const kisiId = req.query.kisi_id || 'all'; 

        let whereKosu = 'ks.sirket_id = ? AND YEAR(gc.tarih_saat) = ? AND MONTH(gc.tarih_saat) = ?';
        let params = [sirketId, yil, ay];
        if (kisiId !== 'all') {
            whereKosu += ' AND gc.kisi_id = ?';
            params.push(kisiId);
        }

        const [kpiData] = await db.query(`
            SELECT 
                SUM(CASE WHEN gc.hareket_tipi = 'CIKIS' THEN 1 ELSE 0 END) AS toplam_cikis,
                SUM(CASE WHEN gc.hareket_tipi = 'GIRIS' THEN 1 ELSE 0 END) AS toplam_giris,
                SUM(CASE WHEN gc.durum_etiketi = 'GEC_GIRIS' THEN 1 ELSE 0 END) AS gec_giris,
                SUM(CASE WHEN gc.durum_etiketi = 'MOLA_ASIMI' THEN 1 ELSE 0 END) AS mola_asimi,
                SUM(CASE WHEN gc.durum_etiketi LIKE '%SUPHELI%' THEN 1 ELSE 0 END) AS supheli_gecis
            FROM giris_cikis gc JOIN kart_sahip ks ON gc.kisi_id = ks.kisi_id WHERE ${whereKosu}
        `, params);

        const [ihlalData] = await db.query(`
            SELECT gc.durum_etiketi, COUNT(*) as sayi
            FROM giris_cikis gc JOIN kart_sahip ks ON gc.kisi_id = ks.kisi_id
            WHERE ${whereKosu} AND gc.durum_etiketi IN ('GEC_GIRIS', 'MOLA_ASIMI', 'SUPHELI_ARA_GIRIS', 'SUPHELI_CIKIS')
            GROUP BY gc.durum_etiketi
        `, params);

        // 1. Gecikme Verileri ve Detayları (Hangi gün, toplam kaç dakika ve o gün geç kalan personeller kimler)
        // 1. Gecikme Verileri (Seçilen aya ait tüm geç giriş loglarını detaylarıyla çekiyoruz)
        const [gecikmeVerileri] = await db.query(`
            SELECT 
                ks.ad, 
                ks.soyad, 
                DATE_FORMAT(gc.tarih_saat, '%d.%m.%Y') as tarih,
                TIME_FORMAT(gc.tarih_saat, '%H:%i') as basilan_saat,
                TIME_FORMAT(gc.uygulanan_mesai_giris, '%H:%i') as mesai_giris,
                gc.uygulanan_tolerans_mesai as tolerans,
                TIMESTAMPDIFF(MINUTE, gc.uygulanan_mesai_giris, TIME(gc.tarih_saat)) as gecikme_dakikasi,
                WEEKDAY(gc.tarih_saat) as gun_index
            FROM giris_cikis gc 
            JOIN kart_sahip ks ON gc.kisi_id = ks.kisi_id
            WHERE ${whereKosu} AND gc.durum_etiketi = 'GEC_GIRIS'
            ORDER BY gc.tarih_saat ASC
        `, params);

        // 2. Erken Çıkış Verileri ve Detayları
        // 2. Erken Çıkış Verileri (Seçilen aya ait tüm erken çıkış loglarını detaylarıyla çekiyoruz)
        const [erkenCikisVerileri] = await db.query(`
            SELECT 
                ks.ad, 
                ks.soyad, 
                DATE_FORMAT(gc.tarih_saat, '%d.%m.%Y') as tarih,
                TIME_FORMAT(gc.tarih_saat, '%H:%i') as basilan_saat,
                TIME_FORMAT(gc.uygulanan_mesai_cikis, '%H:%i') as mesai_cikis,
                gc.uygulanan_tolerans_mesai as tolerans,
                TIMESTAMPDIFF(MINUTE, TIME(gc.tarih_saat), gc.uygulanan_mesai_cikis) as erken_cikis_dakikasi,
                WEEKDAY(gc.tarih_saat) as gun_index
            FROM giris_cikis gc 
            JOIN kart_sahip ks ON gc.kisi_id = ks.kisi_id
            JOIN (
                SELECT kisi_id, DATE(tarih_saat) as islem_tarihi, MAX(tarih_saat) as son_islem_saati
                FROM giris_cikis
                GROUP BY kisi_id, DATE(tarih_saat)
            ) son_islem ON gc.kisi_id = son_islem.kisi_id AND gc.tarih_saat = son_islem.son_islem_saati
            WHERE ${whereKosu} AND gc.durum_etiketi IN ('SUPHELI_CIKIS', 'MOLA_CIKIS')
            ORDER BY gc.tarih_saat ASC
        `, params);
        // 3. Mola Aşımı Verileri
        const [molaAsimiVerileri] = await db.query(`
            SELECT 
                ks.ad, 
                ks.soyad, 
                DATE_FORMAT(gc.tarih_saat, '%d.%m.%Y') as tarih,
                TIME_FORMAT(gc.tarih_saat, '%H:%i') as basilan_saat,
                TIME_FORMAT(gc.uygulanan_mola_bitis, '%H:%i') as mola_bitis,
                gc.uygulanan_tolerans_mola as tolerans,
                TIMESTAMPDIFF(MINUTE, gc.uygulanan_mola_bitis, TIME(gc.tarih_saat)) as asim_dakikasi,
                WEEKDAY(gc.tarih_saat) as gun_index
            FROM giris_cikis gc 
            JOIN kart_sahip ks ON gc.kisi_id = ks.kisi_id
            WHERE ${whereKosu} AND gc.durum_etiketi = 'MOLA_ASIMI'
            ORDER BY gc.tarih_saat ASC
        `, params);

        // res.json KISMINI ŞÖYLE GÜNCELLE:
        res.json({ success: true, kpi: kpiData[0], ihlaller: ihlalData, gecikmeVerileri, erkenCikisVerileri, molaAsimiVerileri });

    } catch (err) {
        console.error("SUNUCU HATASI:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};