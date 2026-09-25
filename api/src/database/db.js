
const mysql = require('mysql2');

// createConnection yerine createPool kullanıyoruz (Sunucular için daha performanslıdır)
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '', 
    database: 'personel_takip',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// En önemli kısım: async/await yapısını desteklemesi için .promise() ekliyoruz
module.exports = pool.promise();

// Havuzun (pool) başarıyla bağlanıp bağlanmadığını test etmek için ufak bir kontrol
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
    } else {
        console.log('MySQL veritabanına başarıyla bağlanıldı (Promise Destekli).');
        connection.release(); // Bağlantıyı havuza geri bırak
    }
});