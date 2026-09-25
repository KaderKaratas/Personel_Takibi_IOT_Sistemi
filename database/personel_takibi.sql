-- Mevcut veritabanını seç
USE personel_takip;

DROP TABLE IF EXISTS giris_cikis;
DROP TABLE IF EXISTS kartlar;
DROP TABLE IF EXISTS kart_sahipleri; -- Eski denemeden kalma ihtimaline karşı
DROP TABLE IF EXISTS kullanici_tipi;
DROP TABLE IF EXISTS sirket;
DROP TABLE IF EXISTS giris_cikis_kayit; 
DROP TABLE IF EXISTS kullanicilar;      



CREATE TABLE sirket (
    sirket_id INT AUTO_INCREMENT PRIMARY KEY,
    sirket_adi VARCHAR(50) NOT NULL,
    mesai_giris TIME,
    mesai_cikis TIME,
    mola_baslangic TIME,
    mola_bitis TIME,
    tolerans_mesai INT,
    tolerans_mola INT,
    mola_tolerans_ust_limit INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE kullanici_tipi (
    tip_id INT AUTO_INCREMENT PRIMARY KEY,
    tip_adi VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE kart_sahip (
    kisi_id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(50) NOT NULL,
    soyad VARCHAR(50) NOT NULL,
    durum VARCHAR(20) DEFAULT 'Aktif',
    sirket_id INT,
    tip_id INT,
    e_posta VARCHAR(50),
    CONSTRAINT fk_kart_sahip_sirket
        FOREIGN KEY (sirket_id) REFERENCES sirket(sirket_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_kart_sahip_tip
        FOREIGN KEY (tip_id) REFERENCES kullanici_tipi(tip_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE kartlar (
    rfid_uid VARCHAR(50) PRIMARY KEY, 
    kisi_id INT,
    CONSTRAINT fk_kartlar_sahip
        FOREIGN KEY (kisi_id) REFERENCES kart_sahip(kisi_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE giris_cikis (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    tarih_saat DATETIME NOT NULL,
    hareket_tipi ENUM('GIRIS', 'CIKIS') NOT NULL,
    durum_etiketi VARCHAR(50),
    not_alani TEXT,
    koku_yogunlugu DECIMAL(10,2), 
    kisi_id INT,
    uygulanan_mesai_giris TIME,
    uygulanan_mesai_cikis TIME,
    uygulanan_mola_baslangic TIME,
    uygulanan_mola_bitis TIME,
    uygulanan_tolerans_mesai INT,
    uygulanan_tolerans_mola INT,
    uygulanan_mola_tolerans_ust_limit INT,
    CONSTRAINT fk_giris_cikis_sahip
        FOREIGN KEY (kisi_id) REFERENCES kart_sahip(kisi_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE kart_sahip ADD sifre VARCHAR(50);

USE personel_takip;

INSERT INTO kullanici_tipi (tip_id, tip_adi) VALUES 
(1, 'Personel'), 
(2, 'Yetkili'), 
(3, 'Admin');

-- 1. Hayali Şirketi Oluşturma
INSERT INTO sirket (sirket_adi) VALUES ('Sistem Yönetimi');

-- 2. Sistem Adminini Kaydetme (sirket_id ve tip_id eşleştirmesiyle)
INSERT INTO kart_sahip (ad, soyad, durum, sirket_id, tip_id, e_posta, sifre) 
VALUES ('Sistem', 'Admin', 'Aktif', 1, 3, 'admin@sdd.com.tr', '123456');

ALTER TABLE giris_cikis DROP COLUMN not_alani;
CREATE TABLE izin_mazeret (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kisi_id INT NOT NULL,
    tur VARCHAR(50) NOT NULL, -- 'izin' veya 'mazeret'
    baslangic_zaman DATETIME NOT NULL,
    bitis_zaman DATETIME NOT NULL,
    FOREIGN KEY (kisi_id) REFERENCES kart_sahip(kisi_id) ON DELETE CASCADE
);
DELETE FROM giris_cikis ORDER BY log_id ASC LIMIT 5;
DELETE FROM kart_sahip WHERE kisi_id IN (9);
DELETE FROM izin_mazeret ORDER BY id ASC LIMIT 1;
SELECT * FROM kart_sahip;

ALTER TABLE kart_sahip DROP FOREIGN KEY fk_kart_sahip_sirket;
ALTER TABLE kart_sahip
ADD CONSTRAINT fk_kart_sahip_sirket
FOREIGN KEY (sirket_id) REFERENCES sirket(sirket_id)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE izin_mazeret DROP FOREIGN KEY fk_izin_mazeret_sahip;

ALTER TABLE izin_mazeret
ADD CONSTRAINT fk_izin_mazeret_sahip
FOREIGN KEY (kisi_id) REFERENCES kart_sahip(kisi_id)
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE kartlar (
    rfid_uid VARCHAR(50) PRIMARY KEY,
    kisi_id INT NOT NULL,
    CONSTRAINT fk_kartlar_sahip 
        FOREIGN KEY (kisi_id) 
        REFERENCES kart_sahip(kisi_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

CREATE TABLE giris_cikis (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    tarih_saat DATETIME DEFAULT CURRENT_TIMESTAMP,
    hareket_tipi ENUM('GIRIS', 'CIKIS') NOT NULL,
    durum_etiketi VARCHAR(50),
    koku_yogunlugu DECIMAL(10,2),
    kisi_id INT NOT NULL,
    uygulanan_mesai_giris TIME,
    uygulanan_mesai_cikis TIME,
    uygulanan_mola_baslangic TIME,
    uygulanan_mola_bitis TIME,
    uygulanan_tolerans_mesai INT,
    uygulanan_tolerans_mola INT,
    uygulanan_mola_tolerans_ust_limit INT,
    CONSTRAINT fk_giris_cikis_sahip 
        FOREIGN KEY (kisi_id) 
        REFERENCES kart_sahip(kisi_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);




SET SQL_SAFE_UPDATES = 0;

UPDATE giris_cikis
SET durum_etiketi = CASE
    -- ===============================
    -- 1. ÇIKIŞ HAREKETLERİ İÇİN KONTROL
    -- ===============================
    WHEN hareket_tipi = 'CIKIS' THEN
        CASE
            -- Mola saatleri içindeyse:
            WHEN TIME(tarih_saat) >= uygulanan_mola_baslangic AND TIME(tarih_saat) <= uygulanan_mola_bitis THEN 'MOLA_CIKIS'
            -- Mesai bitiş saatinden sonraysa:
            WHEN TIME(tarih_saat) >= uygulanan_mesai_cikis THEN 'MESAI_BITIS'
            -- Diğer her şey (Mazeret kontrolü SQL'de zor olduğu için kalanlara şüpheli diyoruz)
            ELSE 'SUPHELI_CIKIS'
        END

    -- ===============================
    -- 2. GİRİŞ HAREKETLERİ İÇİN KONTROL
    -- ===============================
    WHEN hareket_tipi = 'GIRIS' THEN
        CASE
            -- Sabah ilk giriş ve tolerans içi (Örn: 09:00 - 09:15)
            WHEN TIME(tarih_saat) <= ADDTIME(uygulanan_mesai_giris, SEC_TO_TIME(uygulanan_tolerans_mesai * 60)) THEN 'NORMAL_GIRIS'
            
            -- Sabah geç kalanlar (Tolerans bitti, mola başlamadıysa)
            WHEN TIME(tarih_saat) > ADDTIME(uygulanan_mesai_giris, SEC_TO_TIME(uygulanan_tolerans_mesai * 60)) AND TIME(tarih_saat) < uygulanan_mola_baslangic THEN 'GEC_GIRIS'
            
            -- Mola dönüşü (Tolerans dahilinde: Örn 13:30 - 13:35)
            WHEN TIME(tarih_saat) > uygulanan_mola_baslangic 
                 AND TIME(tarih_saat) <= ADDTIME(uygulanan_mola_bitis, SEC_TO_TIME(uygulanan_tolerans_mola * 60)) THEN 'MOLA_DONUS_NORMAL'
                 
            -- Mola Aşımı (Mola toleransını geçmiş ama üst limite kadar: Örn 13:35 - 14:00)
            WHEN TIME(tarih_saat) > ADDTIME(uygulanan_mola_bitis, SEC_TO_TIME(uygulanan_tolerans_mola * 60)) 
                 AND TIME(tarih_saat) <= ADDTIME(uygulanan_mola_bitis, SEC_TO_TIME(uygulanan_mola_tolerans_ust_limit * 60)) THEN 'MOLA_ASIMI'
            
            -- Kalan tüm alakasız girişler
            ELSE 'SUPHELI_ARA_GIRIS'
        END
END
WHERE durum_etiketi IS NULL;

SET SQL_SAFE_UPDATES = 1;


SELECT * FROM giris_cikis
WHERE kisi_id= 5;
SELECT * FROM giris_cikis;


SELECT * FROM giris_cikis ORDER BY log_id DESC;

select * from giris_cikis
WHERE kisi_id= 5
ORDER BY tarih_saat DESC;

-- MySQL'de Cumartesi (7) ve Pazar (1) günlerine ait kayıtları siler
DELETE FROM giris_cikis 
WHERE DAYOFWEEK(tarih_saat) IN (1, 7);
DELETE t1 FROM izin_mazeret t1
INNER JOIN izin_mazeret t2 
WHERE 
    t1.id < t2.id AND 
    t1.kisi_id = t2.kisi_id AND 
    t1.tur = t2.tur AND 
    t1.baslangic_zaman = t2.baslangic_zaman AND 
    t1.bitis_zaman = t2.bitis_zaman;


DELETE FROM giris_cikis 
WHERE tarih_saat = '2026-08-24';

DELETE FROM izin_mazeret
WHERE baslangic_zaman >= '2026-08-24 00:00:00'
  AND baslangic_zaman < '2026-08-25 00:00:00';
DELETE FROM giris_cikis
WHERE tarih_saat >= '2026-08-24 00:00:00'
  AND tarih_saat < '2026-08-25 00:00:00';

select * from kart_sahip;










