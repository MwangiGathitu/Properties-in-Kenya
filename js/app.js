(function () {
    'use strict';

    function openLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    function toggleMobileMenu() {
        document.getElementById('mobileMenuDrawer').classList.remove('active');
        document.getElementById('mobileMenuOverlay').classList.remove('active');
        document.getElementById('hamburgerBtn').classList.remove('active');
        document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
    }

    function showFavorites() {
        const favIds = getFavorites();
        const section = document.getElementById('favoritesSection');
        const grid = document.getElementById('favoritesGrid');
        const favProps = state.allProperties.filter(p => favIds.includes(p.id));

        if (favProps.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#9CA3AF;"><i class="far fa-heart" style="font-size:40px;margin-bottom:16px;display:block;"></i><h3 style="font-size:18px;font-weight:600;color:#6B7280;">No saved properties yet</h3></div>';
        } else {
            grid.innerHTML = favProps.map(p => `
                <div class="property-card" onclick="window.location.href='/property/${p.id}'" style="flex:initial;">
                    <div class="property-card-image"><img src="${getSafeImage(p)}" alt="${escapeHtml(p.title)}"></div>
                    <div class="property-card-body"><h3 class="property-card-title">${escapeHtml(p.title)}</h3><div class="property-card-price">${formatKES(p.price)}</div></div>
                </div>`).join('');
        }
        section.classList.add('active');
        section.scrollIntoView({ behavior: 'smooth' });
    }

    function hideFavorites() {
        document.getElementById('favoritesSection').classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.toggleFavorite = function (id, btn) {
        const favs = getFavorites();
        const idx = favs.indexOf(id);
        if (idx > -1) favs.splice(idx, 1); else favs.push(id);
        saveFavorites(favs);
        btn.classList.toggle('active');
        btn.querySelector('i').classList.toggle('fas');
        btn.querySelector('i').classList.toggle('far');
    };

    window.filterByCategory = function(category) {
        const filtered = category === 'all' ? state.allProperties : state.allProperties.filter(p => p.property_type === category);
        renderFeatured(filtered);
        setTimeout(() => document.getElementById('featured').scrollIntoView({ behavior: 'smooth' }), 200);
    };

    function initEventListeners() {
        // Login
        document.getElementById('loginBtn').addEventListener('click', openLoginModal);
        document.getElementById('mobileLoginBtn').addEventListener('click', () => { openLoginModal(); toggleMobileMenu(); });
        document.getElementById('mobileLoginCta').addEventListener('click', () => { openLoginModal(); toggleMobileMenu(); });
        document.getElementById('closeLoginModal').addEventListener('click', closeLoginModal);
        document.getElementById('loginModal').addEventListener('click', e => { if (e.target.id === 'loginModal') closeLoginModal(); });

        // Mobile menu
        document.getElementById('hamburgerBtn').addEventListener('click', () => {
            document.getElementById('mobileMenuDrawer').classList.add('active');
            document.getElementById('mobileMenuOverlay').classList.add('active');
            document.getElementById('hamburgerBtn').classList.add('active');
            document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
        });
        document.getElementById('mobileMenuClose').addEventListener('click', toggleMobileMenu);
        document.getElementById('mobileMenuOverlay').addEventListener('click', toggleMobileMenu);

        // Hero search
        document.getElementById('heroSearchForm').addEventListener('submit', e => {
            e.preventDefault();
            const query = document.getElementById('heroSearchInput').value.trim();
            if (query) askAI(query);
        });

        // Category & carousel delegation
        document.addEventListener('click', e => {
            const catBtn = e.target.closest('[data-category]');
            if (catBtn && !catBtn.classList.contains('category-card-img')) {
                const category = catBtn.dataset.category;
                filterByCategory(category);
            }
            const carouselBtn = e.target.closest('[data-carousel]');
            if (carouselBtn) {
                const container = document.getElementById(carouselBtn.dataset.carousel);
                const dir = carouselBtn.classList.contains('prev') ? -1 : 1;
                container.scrollBy({ left: dir * 364, behavior: 'smooth' });
            }
        });

        // Favorites
        document.getElementById('navFavoritesBtn').addEventListener('click', showFavorites);
        document.getElementById('mobileFavoritesBtn').addEventListener('click', () => { showFavorites(); toggleMobileMenu(); });
        document.getElementById('hideFavoritesBtn').addEventListener('click', hideFavorites);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        loadHomepageData();
    });

})();
