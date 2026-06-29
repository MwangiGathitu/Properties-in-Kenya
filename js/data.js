async function loadHomepageData() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.innerHTML = Array(4).fill(`
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line w60"></div>
                <div class="skeleton-line w80"></div>
                <div class="skeleton-line w40"></div>
            </div>
        </div>
    `).join('');

    try {
        const { data: properties, error } = await supabaseClient
            .from("properties")
            .select("*")
            .eq("approval_status", "approved")
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) throw error;
        state.allProperties = properties || [];

        const [saleRes, rentRes, leaseRes, allRes] = await Promise.all([
            supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'for sale'),
            supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'for rent'),
            supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'lease'),
            supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved')
        ]);

        const saleCount = saleRes.count || 0;
        const rentCount = rentRes.count || 0;
        const leaseCount = leaseRes.count || 0;
        const allCount = allRes.count || 0;

        // Update category cards
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val + ' listings'; };
        set('catForSale', saleCount);
        set('catForRent', rentCount);
        set('catLand', Math.floor(allCount * 0.3));
        set('catCommercial', leaseCount);
        set('catAll', allCount);

        // Update stat
        const statEl = document.getElementById('statProperties');
        if (statEl) statEl.innerHTML = `<span class="stat-accent">${allCount.toLocaleString()}</span>`;

        renderFeatured(state.allProperties);
        updateFavoritesCount();
        injectPropertyListSchema();

    } catch (error) {
        console.error('Error loading homepage:', error);
        carousel.innerHTML = '<div style="padding:60px;text-align:center;color:#9CA3AF;width:100%;"><p style="font-size:16px;font-weight:500;">Unable to load properties</p><p style="font-size:14px;margin-top:8px;">Please refresh the page</p></div>';
    }
}

function renderFeatured(properties) {
    const carousel = document.getElementById('featuredCarousel');
    if (!properties || properties.length === 0) {
        carousel.innerHTML = '<div style="padding:60px;text-align:center;color:#9CA3AF;width:100%;"><p style="font-size:16px;font-weight:500;">No properties yet</p></div>';
        return;
    }
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        const isFav = getFavorites().includes(p.id);
        const isNew = (new Date() - new Date(p.created_at)) < 7 * 24 * 60 * 60 * 1000;
        return `
        <article class="property-card" onclick="window.location.href='/property/${p.id}'">
            <div class="property-card-image">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'">
                <div class="property-badge-group">
                    <span class="property-badge type">${escapeHtml((p.property_type || 'FOR SALE').toUpperCase())}</span>
                    ${isNew ? '<span class="property-badge new">New</span>' : ''}
                    <span class="property-badge verified"><i class="fas fa-check" style="font-size:9px;"></i> Verified</span>
                </div>
                <button class="property-fav ${isFav ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); toggleFavorite('${p.id}', this)">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="property-card-body">
                <div class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.location || 'Kenya')}</div>
                <h3 class="property-card-title">${escapeHtml(p.title || 'Property in Kenya')}</h3>
                <div class="property-card-price">${formatKES(p.price)}</div>
                <div class="property-card-meta">
                    ${p.bedrooms ? `<span class="property-card-meta-item"><i class="fas fa-bed"></i> ${p.bedrooms} Beds</span>` : ''}
                    ${p.bathrooms ? `<span class="property-card-meta-item"><i class="fas fa-bath"></i> ${p.bathrooms} Baths</span>` : ''}
                    ${p.area ? `<span class="property-card-meta-item"><i class="fas fa-ruler-combined"></i> ${p.area}</span>` : ''}
                </div>
            </div>
        </article>`;
    }).join('');
}

function renderAIResults(properties) {
    const section = document.getElementById('aiResultsSection');
    const carousel = document.getElementById('aiResultsCarousel');
    document.getElementById('aiResultsCount').textContent = `${properties.length} properties found`;
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        return `
        <article class="property-card" onclick="window.location.href='/property/${p.id}'">
            <div class="property-card-image">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" loading="lazy">
                <div class="property-badge-group">
                    <span class="property-badge type">${escapeHtml((p.property_type || 'FOR SALE').toUpperCase())}</span>
                </div>
            </div>
            <div class="property-card-body">
                <div class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.location || 'Kenya')}</div>
                <h3 class="property-card-title">${escapeHtml(p.title)}</h3>
                <div class="property-card-price">${formatKES(p.price)}</div>
            </div>
        </article>`;
    }).join('');
    section.classList.add('active');
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
}

function injectPropertyListSchema() {
    const existing = document.getElementById('dynamic-property-list-schema');
    if (existing) existing.remove();
    if (state.allProperties.length === 0) return;
    const listings = state.allProperties.map(p => ({
        "@type": "RealEstateListing",
        "name": p.title,
        "url": `https://propertiesinkenya.co.ke/property/${p.id}`,
        "image": getSafeImage(p),
        "address": { "@type": "PostalAddress", "addressLocality": p.location || "Nairobi", "addressCountry": "KE" },
        "offers": { "@type": "Offer", "price": p.price, "priceCurrency": "KES" }
    }));
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Properties in Kenya",
        "itemListElement": listings.map((item, idx) => ({ "@type": "ListItem", "position": idx + 1, "item": item }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamic-property-list-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}
