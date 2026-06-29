function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) { return false; }
}

function getSafeImage(p) {
    const img = p.images?.[0] || p.image_url;
    return (img && isValidUrl(img)) ? img : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';
}

function formatKES(amount) {
    return `KSh ${Number(amount || 0).toLocaleString()}`;
}

function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
    catch { return []; }
}

function saveFavorites(favs) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    updateFavoritesCount();
}

function updateFavoritesCount() {
    const count = getFavorites().length;
    document.querySelectorAll('.favorites-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

function debounce(func, wait) {
    return (...args) => {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(() => func(...args), wait);
    };
}
