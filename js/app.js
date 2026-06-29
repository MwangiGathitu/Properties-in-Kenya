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

    // ===== FLOATING CARETAKER CHAT FUNCTIONALITY =====
    function openCaretakerChat() {
        document.getElementById('caretakerChatOverlay').classList.add('active');
        document.getElementById('caretakerChatInput').focus();
        document.body.style.overflow = 'hidden';
    }

    function closeCaretakerChat() {
        document.getElementById('caretakerChatOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    async function sendCaretakerMessage(query) {
        if (!query.trim()) return;
        
        const messagesDiv = document.getElementById('caretakerChatMessages');
        const sendBtn = document.getElementById('caretakerChatSend');
        const input = document.getElementById('caretakerChatInput');
        
        // Remove suggestions if they exist
        const existingSuggestions = messagesDiv.querySelector('.caretaker-suggestions');
        if (existingSuggestions) existingSuggestions.remove();
        
        // Add user message
        messagesDiv.innerHTML += `
            <div class="caretaker-chat-message user">
                <div class="caretaker-chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="caretaker-chat-bubble">${escapeHtml(query)}</div>
            </div>
        `;
        
        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        messagesDiv.innerHTML += `
            <div class="caretaker-chat-message ai" id="${typingId}">
                <div class="caretaker-chat-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="caretaker-typing">
                    <div class="caretaker-typing-dot"></div>
                    <div class="caretaker-typing-dot"></div>
                    <div class="caretaker-typing-dot"></div>
                </div>
            </div>
        `;
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        sendBtn.disabled = true;
        input.value = '';
        
        try {
            const response = await fetch('/api/ai-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            // Remove typing indicator
            document.getElementById(typingId).remove();
            
            if (!response.ok) throw new Error('Server error');
            
            const result = await response.json();
            const filteredProperties = applyAIFilters(result.filters);
            
            const aiMsg = filteredProperties.length === 0
                ? `I couldn't find properties matching "${escapeHtml(query)}". Try adjusting your criteria or browse all listings.`
                : `✨ Great news! I found ${filteredProperties.length} properties matching your criteria. Check them out below!`;
            
            messagesDiv.innerHTML += `
                <div class="caretaker-chat-message ai">
                    <div class="caretaker-chat-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="caretaker-chat-bubble">${aiMsg}</div>
                </div>
            `;
            
            if (filteredProperties.length > 0) {
                // Add property preview cards
                filteredProperties.slice(0, 3).forEach(p => {
                    messagesDiv.innerHTML += `
                        <div class="caretaker-chat-message ai">
                            <div class="caretaker-chat-bubble" style="padding: 0; overflow: hidden; border-radius: 12px;">
                                <img src="${getSafeImage(p)}" alt="${escapeHtml(p.title)}" style="width: 100%; height: 120px; object-fit: cover;">
                                <div style="padding: 12px;">
                                    <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${escapeHtml(p.title)}</div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">${escapeHtml(p.location)}</div>
                                    <div style="font-weight: 700; color: #B8922E; font-size: 14px;">${formatKES(p.price)}</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                if (filteredProperties.length > 3) {
                    messagesDiv.innerHTML += `
                        <div class="caretaker-chat-message ai">
                            <div class="caretaker-chat-bubble" style="text-align: center;">
                                <a href="#featured" onclick="closeCaretakerChat(); setTimeout(() => document.getElementById('featured').scrollIntoView({behavior: 'smooth'}), 100);" style="color: #7C4DFF; font-weight: 600; text-decoration: none;">
                                    View all ${filteredProperties.length} properties →
                                </a>
                            </div>
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            document.getElementById(typingId).remove();
            messagesDiv.innerHTML += `
                <div class="caretaker-chat-message ai">
                    <div class="caretaker-chat-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="caretaker-chat-bubble">
                        I'm having trouble connecting right now. Please try again in a moment.
                    </div>
                </div>
            `;
        } finally {
            sendBtn.disabled = false;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    function initCaretakerChat() {
        // Open chat
        document.getElementById('caretakerFloatBtn').addEventListener('click', openCaretakerChat);
        
        // Close chat
        document.getElementById('caretakerChatClose').addEventListener('click', closeCaretakerChat);
        document.getElementById('caretakerChatOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'caretakerChatOverlay') closeCaretakerChat();
        });
        
        // Send message
        document.getElementById('caretakerChatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('caretakerChatInput');
            sendCaretakerMessage(input.value);
        });
        
        // Quick suggestions
        document.querySelectorAll('.caretaker-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                sendCaretakerMessage(btn.dataset.query);
            });
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const chatOverlay = document.getElementById('caretakerChatOverlay');
                if (chatOverlay.classList.contains('active')) {
                    closeCaretakerChat();
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        loadHomepageData();
        initCaretakerChat();
    });

})();
