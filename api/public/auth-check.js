document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/oturum-kontrol', { cache: 'no-store' });
        const result = await response.json();

        // Eğer oturum yoksa ve şu an login sayfasında değilsek, saniyesinde fırlat
        if (!result.authenticated) {
            if (!window.location.href.includes('login.html')) {
                window.location.href = '/login.html';
            }
            return; // Kodun devamını durdur
        }
    } catch (error) {
        if (!window.location.href.includes('login.html')) {
            window.location.href = '/login.html';
        }
    }
});