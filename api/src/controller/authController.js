/*const db = require('../database/db');

const login = (req, res) => {
    const { e_posta, sifre } = req.body;
    const sql = "SELECT kisi_id, ad, soyad, tip_id, sifre FROM kart_sahip WHERE e_posta = ?";
    
    db.query(sql, [e_posta], (err, results) => {
        if (err) return res.status(500).send("Sunucu hatası.");

        if (results.length > 0) {
            const kullanici = results[0];
            
            // Personel girişi engelleme
            if (kullanici.tip_id === 1) {
                return res.send("Giriş reddedildi: Sadece yetkililer girebilir.");
            }

            // Şifre kontrolü
            if (kullanici.sifre === sifre) {
                req.session.kullanici = {
                    kisi_id: kullanici.kisi_id,
                    ad: kullanici.ad,
                    tip_id: kullanici.tip_id
                };

                // Yönlendirme (Sayfaları bir sonraki adımda yapacağız)
                if (kullanici.tip_id === 3) res.redirect('/admin/admin-paneli.html');
                else if (kullanici.tip_id === 2) res.redirect('/admin/yetkili-paneli.html');
            } else {
                res.send("Hatalı şifre.");
            }
        } else {
            res.send("Kullanıcı bulunamadı.");
        }
    });
};

module.exports = { login };*/
const db = require('../database/db');

const login = async (req, res) => {
    const { e_posta, sifre, giris_tipi } = req.body;

    
    const sql = "SELECT kisi_id, ad, soyad, tip_id, sirket_id, sifre FROM kart_sahip WHERE e_posta = ?";
    
    
    try {
        // 3. Callback yerine await ve db.execute kullandık
        const [results] = await db.execute(sql, [e_posta]);

        if (results.length > 0) {
            const kullanici = results[0];
            
            // Personel girişi engelleme
if (kullanici.tip_id === 1) {
    return res.status(403).json({ success: false, message: "Giriş reddedildi: Sadece yetkililer girebilir." });
}

// Varsayım: tip_id = 3 (Yönetici / Admin), tip_id = 2 (Yetkili)
if (giris_tipi === 'yonetici' && kullanici.tip_id !== 3) {
    return res.status(403).json({ success: false, message: "Yetkisiz Giriş: Bu sekmeden sadece Yöneticiler giriş yapabilir!" });
}

if (giris_tipi === 'yetkili' && kullanici.tip_id !== 2) {
    return res.status(403).json({ success: false, message: "Yetkisiz Giriş: Bu sekmeden sadece Yetkililer giriş yapabilir!" });
}

// Şifre kontrolü
if (kullanici.sifre === sifre) {
    req.session.kisi_id = kullanici.kisi_id;
    req.session.ad = kullanici.ad;
    req.session.tip_id = kullanici.tip_id;
    req.session.sirket_id = kullanici.sirket_id; 

    // Yönlendirme adreslerini JSON olarak frontend'e gönderiyoruz
    if (kullanici.tip_id === 3) {
        return res.json({ success: true, redirectUrl: '/admin/admin-paneli.html' });
    } else if (kullanici.tip_id === 2) {
        return res.json({ success: true, redirectUrl: '/yetkili/yetkili-paneli.html' });
    }
    } else {
        return res.status(401).json({ success: false, message: "Hatalı şifre." });
    }
    } else {
        return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }
    } catch (err) {
        console.error("Giriş işlemi sırasında veritabanı hatası:", err);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
        } 

module.exports = { login };