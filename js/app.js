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
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:#9CA3AF;">
                    <i class="far fa-heart" style="font-size:40px; margin-bottom:16px; display:block;"></i>
                    <h3>No saved properties yet</h3>
                    <p>Click the heart icon on any property to save it here</p>
                </div>`;
        } else {
            grid.innerHTML = favProps.map(p => `
                <div class="featured-card" onclick="window.location.href='/property/${p.id}'" style="flex:initial;">
                    <img src="${getSafeImage(p)}" class="featured-image" alt="${escapeHtml(p.title)}">
                    <div class="featured-info">
                        <h3 class="featured-title">${escapeHtml(p.title)}</h3>
                        <div class="featured-price">${formatKES(p.price)}</div>
                    </div>
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

    function initEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', openLoginModal);
        document.getElementById('mobileLoginBtn').addEventListener('click', () => { openLoginModal(); toggleMobileMenu(); });
        document.getElementById('mobileLoginCta').addEventListener('click', () => { openLoginModal(); toggleMobileMenu(); });
        document.getElementById('closeLoginModal').addEventListener('click', closeLoginModal);
        document.getElementById('loginModal').addEventListener('click', e => {
            if (e.target.id === 'loginModal') closeLoginModal();
        });

        document.getElementById('hamburgerBtn').addEventListener('click', () => {
            document.getElementById('mobileMenuDrawer').classList.add('active');
            document.getElementById('mobileMenuOverlay').classList.add('active');
            document.getElementById('hamburgerBtn').classList.add('active');
            document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
        });
        document.getElementById('mobileMenuClose').addEventListener('click', toggleMobileMenu);
        document.getElementById('mobileMenuOverlay').addEventListener('click', toggleMobileMenu);

        document.addEventListener('click', e => {
            const catBtn = e.target.closest('[data-category]');
            if (catBtn) {
                const category = catBtn.dataset.category;
                document.querySelectorAll('.category-card').forEach(c => {
                    c.classList.remove('active');
                    c.setAttribute('aria-selected', 'false');
                });
                const activeCard = document.querySelector(`.category-card[data-category="${category}"]`);
                if (activeCard) {
                    activeCard.classList.add('active');
                    activeCard.setAttribute('aria-selected', 'true');
                }
                const filtered = category === 'all'
                    ? state.allProperties
                    : state.allProperties.filter(p => p.property_type === category);
                renderFeatured(filtered);
                setTimeout(() => document.getElementById('featured').scrollIntoView({ behavior: 'smooth' }), 100);
            }

            const carouselBtn = e.target.closest('[data-carousel]');
            if (carouselBtn) {
                const container = document.getElementById(carouselBtn.dataset.carousel);
                const dir = carouselBtn.classList.contains('prev') ? -1 : 1;
                container.scrollBy({ left: dir * 380, behavior: 'smooth' });
            }
        });

        document.getElementById('aiSearchForm').addEventListener('submit', e => {
            e.preventDefault();
            askAI(document.getElementById('aiQuery').value.trim());
        });
        document.querySelectorAll('.ai-suggestion').forEach(btn => {
            btn.addEventListener('click', () => askAI(btn.dataset.query));
        });

        document.getElementById('navFavoritesBtn').addEventListener('click', showFavorites);
        document.getElementById('mobileFavoritesBtn').addEventListener('click', () => { showFavorites(); toggleMobileMenu(); });
        document.getElementById('hideFavoritesBtn').addEventListener('click', hideFavorites);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        loadHomepageData();
    });

})();
