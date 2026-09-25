const db = require('../database/db'); 

exports.kartOku = async (req, res) => {
    console.log(req.body)
    const cardId = req.body.cardId;

    if (!cardId) {
        console.log("Hata: Kart ID gönderilmedi!");
        return res.status(400).json({ message: "Kart ID eksik!" });
    }
    if (!cardId || cardId === "000000000000" || cardId.includes("000000")) {
        console.log("Uyarı: Okuyucudan geçersiz/boş kart verisi geldi, yoksayıldı.");
        return res.status(400).json({ success: false, message: "Geçersiz kart okuması." });
    }

    try {
        // ==========================================
        // 1. KART SAHİBİNİ, ŞİRKETİNİ VE DURUMUNU BUL
        // ==========================================
        const [kartBilgisi] = await db.execute(`
            SELECT k.kisi_id, concat(ks.ad, ' ',  ks.soyad) AS ad_soyad, ks.sirket_id, ks.durum 
            FROM kartlar k
            JOIN kart_sahip ks ON k.kisi_id = ks.kisi_id
            WHERE k.rfid_uid = ?
        `, [cardId]);

        if (kartBilgisi.length === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] Hata: Tanımsız Kart! ID: ${cardId}`);
            return res.status(404).json({ message: "Tanımsız veya atanmamış kart!" });
        }
        
        // BURASI DÜZELTİLDİ: 'durum' değişkeni buradan eklendi
        const { kisi_id, ad_soyad, sirket_id, durum } = kartBilgisi[0];

        // KURAL: Eğer personel pasif ise kart okutması reddedilsin
        if (durum && durum.toLowerCase() === 'pasif') {
            console.log(`[${new Date().toLocaleTimeString()}] İşlem Reddedildi: Personel pasif konumda. ID: ${cardId}`);
            return res.status(403).json({ success: false, message: "İşlem reddedildi. Bu kartın ait olduğu personel pasiftir!" });
        }
        
        // 2. ŞİRKET KURALLARINI (SNAPSHOT) ÇEK
        const [sirketBilgisi] = await db.execute(`
            SELECT mesai_giris, mesai_cikis, mola_baslangic, mola_bitis, 
                   tolerans_mesai, tolerans_mola, mola_tolerans_ust_limit
            FROM sirket 
            WHERE sirket_id = ?
        `, [sirket_id]);

        if (sirketBilgisi.length === 0) {
            return res.status(404).json({ message: "Şirket bilgisi bulunamadı!" });
        }
        const sirket = sirketBilgisi[0];

        // 3. İZİN VE MAZERET KONTROLÜ
        const [izinMazeretList] = await db.execute(`
            SELECT tur, baslangic_zaman, bitis_zaman 
            FROM izin_mazeret 
            WHERE kisi_id = ? 
            AND DATE(baslangic_zaman) <= CURDATE() 
            AND DATE(bitis_zaman) >= CURDATE()
        `, [kisi_id]);

        let tamGunIzin = false;
        let aktifMazeret = false;
        const nowTimeMs = new Date().getTime(); 

        for (let kayit of izinMazeretList) {
            const tur = kayit.tur ? kayit.tur.toLowerCase() : '';
            
            if (tur === 'izin') {
                tamGunIzin = true;
            } else if (tur === 'mazeret') {
                const mBaslangic = new Date(kayit.baslangic_zaman).getTime();
                const mBitis = new Date(kayit.bitis_zaman).getTime();
                
                if (nowTimeMs >= mBaslangic && nowTimeMs <= mBitis) {
                    aktifMazeret = true;
                }
            }
        }
        if (tamGunIzin) {
            console.log(`[${new Date().toLocaleTimeString()}] İşlem Reddedildi: Personel bugün izinli. ID: ${cardId}`);
            return res.status(403).json({ message: "İşlem reddedildi. Personel bugün izinli!" });
        }
          
        const [sonHareket] = await db.execute(`
            SELECT hareket_tipi, tarih_saat 
            FROM giris_cikis 
            WHERE kisi_id = ? AND DATE(tarih_saat) = CURDATE()
            ORDER BY log_id DESC 
            LIMIT 1
        `, [kisi_id]);

        const isIlkGiris = sonHareket.length === 0;
        let yeniHareketTipi = 'GIRIS'; 
        
        if (!isIlkGiris) {
            const sonKayit = sonHareket[0];

            // Çift okutma koruması (60 saniye)
            const sonOkutmaZamani = new Date(sonKayit.tarih_saat).getTime();
            const suAnkiZaman = new Date().getTime();
            const saniyeFarki = (suAnkiZaman - sonOkutmaZamani) / 1000;

            /*if (saniyeFarki < 60) {
                console.log(`[${new Date().toLocaleTimeString()}] Uyarı: Peş peşe okutma engellendi. ID: ${cardId}`);
                return res.status(429).json({ success: false, message: "Kartınız okundu. Lütfen bekleyin." });
            }*/

            if (sonKayit.hareket_tipi === 'GIRIS') {
                yeniHareketTipi = 'CIKIS';
            } else {
                yeniHareketTipi = 'GIRIS';
            }
        }
        const simdi = new Date();
        const saatGuncelStr = simdi.toTimeString().split(' ')[0]; 
        
        const timeToMins = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':');
            return parseInt(h) * 60 + parseInt(m);
        };

        const guncelDk = timeToMins(saatGuncelStr);
        const mesaiGirisDk = timeToMins(sirket.mesai_giris);
        const mesaiCikisDk = timeToMins(sirket.mesai_cikis);
        const molaBaslangicDk = timeToMins(sirket.mola_baslangic);
        const molaBitisDk = timeToMins(sirket.mola_bitis);
        
        const toleransMesai = sirket.tolerans_mesai || 0;
        const toleransMola = sirket.tolerans_mola || 0;
        const molaToleransUstLimit = sirket.mola_tolerans_ust_limit || 0;

        let durumEtiketi = "";

        if (yeniHareketTipi === 'GIRIS') {
            if (isIlkGiris) {
                // --- GÜNÜN İLK GİRİŞİ ---
                if (guncelDk <= (mesaiGirisDk + toleransMesai)) {
                    durumEtiketi = "NORMAL_GIRIS"; 
                } else {
                    if (aktifMazeret) durumEtiketi = "MAZERETLI_GIRIS";
                    else durumEtiketi = "GEC_GIRIS";
                }
            } else {
                
                const mesaiSonuToleransDk = mesaiGirisDk + toleransMesai;

                if (guncelDk > mesaiSonuToleransDk && guncelDk < molaBaslangicDk) {
                    if (aktifMazeret) {
                        durumEtiketi = "MAZERETLI_GIRIS";
                    } else {
                        durumEtiketi = "SUPHELI_ARA_GIRIS"; 
                    }
                } 
                else {
                    const molaDonusTolerans = molaBitisDk + toleransMola;
                    const molaUstLimit = molaBitisDk + molaToleransUstLimit;

                    if (guncelDk <= molaDonusTolerans) {
                        durumEtiketi = "MOLA_DONUS_NORMAL";
                    } else if (guncelDk <= molaUstLimit) {
                        if (aktifMazeret) durumEtiketi = "MAZERETLI_GIRIS";
                        else durumEtiketi = "MOLA_ASIMI";
                    } else {
                        if (aktifMazeret) durumEtiketi = "MAZERETLI_GIRIS";
                        else durumEtiketi = "SUPHELI_ARA_GIRIS";
                    }
                }
            }
        } else if (yeniHareketTipi === 'CIKIS') {
            
            if (guncelDk >= molaBaslangicDk && guncelDk <= molaBitisDk) {
                durumEtiketi = "MOLA_CIKIS";
            } else if (guncelDk >= mesaiCikisDk) {
                durumEtiketi = "MESAI_BITIS";
            } else {
                if (aktifMazeret) durumEtiketi = "IZINLI_CIKIS";
                else durumEtiketi = "SUPHELI_CIKIS";
            }
        }
        await db.execute(`
            INSERT INTO giris_cikis (
                kisi_id, tarih_saat, hareket_tipi, durum_etiketi,
                uygulanan_mesai_giris, uygulanan_mesai_cikis, 
                uygulanan_mola_baslangic, uygulanan_mola_bitis, 
                uygulanan_tolerans_mesai, uygulanan_tolerans_mola, uygulanan_mola_tolerans_ust_limit
            ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            kisi_id, 
            yeniHareketTipi, 
            durumEtiketi,
            sirket.mesai_giris, 
            sirket.mesai_cikis,
            sirket.mola_baslangic, 
            sirket.mola_bitis,
            sirket.tolerans_mesai, 
            sirket.tolerans_mola, 
            sirket.mola_tolerans_ust_limit
        ]);

        console.log(`[${simdi.toLocaleTimeString()}] İşlem Başarılı: Kart ID: ${cardId}, Yön: ${yeniHareketTipi}, Durum: ${durumEtiketi}`);
        
        /*return res.status(200).json({ 
            message: "Kayıt başarılı", 
            id: cardId,
            hareket: yeniHareketTipi,
            durum: durumEtiketi
        });*/
        console.log(ad_soyad)
        return res.status(200).json({
            success: true,
            ad_soyad: ad_soyad,
        });

    } catch (error) {
        console.error("Veritabanı kayıt hatası:", error);
        return res.status(500).json({ message: "Sunucu tarafında veritabanı hatası!" });
    }
};