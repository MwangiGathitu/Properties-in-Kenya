async function loadHomepageData() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.innerHTML = Array(4).fill(
        '<div style="flex:0 0 360px; height:380px; background:#E5E7EB; border-radius:16px;"></div>'
    ).join('');

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

        document.getElementById('count-all').textContent = `${allRes.count || 0} properties`;
        document.getElementById('count-sale').textContent = `${saleRes.count || 0} properties`;
        document.getElementById('count-rent').textContent = `${rentRes.count || 0} properties`;
        document.getElementById('count-lease').textContent = `${leaseRes.count || 0} properties`;

        document.getElementById('statProperties').textContent = (allRes.count || 0).toLocaleString();
        document.getElementById('statProperties').classList.remove('loading');
        document.getElementById('statAgents').textContent = "150+";
        document.getElementById('statAgents').classList.remove('loading');
        document.getElementById('statSearches').textContent = "12k+";
        document.getElementById('statSearches').classList.remove('loading');

        renderFeatured(state.allProperties);
        updateFavoritesCount();
        injectPropertyListSchema();

    } catch (error) {
        console.error('Error loading homepage:', error);
        carousel.innerHTML = '<div style="padding:40px; text-align:center; color:#9CA3AF; width:100%;">Failed to load properties</div>';
    }
}

function renderFeatured(properties) {
    const carousel = document.getElementById('featuredCarousel');
    if (properties.length === 0) {
        carousel.innerHTML = '<div style="padding:40px; text-align:center; color:#9CA3AF; width:100%;">No properties yet</div>';
        return;
    }
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        const isFav = getFavorites().includes(p.id);
        const propertyUrl = `/property/${p.id}`;
        return `
        <article class="featured-card" onclick="window.location.href='${propertyUrl}'">
            <div style="position:relative; overflow:hidden;">
                <img src="${escapeHtml(img)}" class="featured-image" alt="${escapeHtml(p.title)}" loading="lazy">
                <div class="featured-badge">${escapeHtml((p.property_type || 'FOR SALE').toUpperCase())}</div>
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); toggleFavorite('${p.id}', this)">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="featured-info">
                <h3 class="featured-title">${escapeHtml(p.title)}</h3>
                <div class="featured-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.location || 'Kenya')}</div>
                <div class="featured-price">${formatKES(p.price)}</div>
                <div class="featured-meta">
                    ${p.bedrooms ? `<span class="featured-meta-item"><i class="fas fa-bed"></i> ${p.bedrooms}</span>` : ''}
                    ${p.bathrooms ? `<span class="featured-meta-item"><i class="fas fa-bath"></i> ${p.bathrooms}</span>` : ''}
                </div>
            </div>
        </article>`;
    }).join('');
}

function renderAIResults(properties) {
    const section = document.getElementById('aiResultsSection');
    const carousel = document.getElementById('aiResultsCarousel');
    document.getElementById('aiResultsCount').textContent = `Found ${properties.length} properties`;
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        const propertyUrl = `/property/${p.id}`;
        return `
        <article class="ai-result-card" onclick="window.location.href='${propertyUrl}'">
            <img src="${escapeHtml(img)}" class="ai-result-image" alt="${escapeHtml(p.title)}" loading="lazy">
            <div class="ai-result-info">
                <h3 class="ai-result-title">${escapeHtml(p.title)}</h3>
                <div class="ai-result-location">${escapeHtml(p.location || 'Kenya')}</div>
                <div class="ai-result-price">${formatKES(p.price)}</div>
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
        "description": (p.description || '').substring(0, 200),
        "url": `https://propertiesinkenya.co.ke/property/${p.id}`,
        "image": getSafeImage(p),
        "address": { "@type": "PostalAddress", "addressLocality": p.location || "Nairobi", "addressCountry": "KE" },
        "offers": { "@type": "Offer", "price": p.price, "priceCurrency": "KES" }
    }));
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Properties in Kenya Listings",
        "itemListElement": listings.map((item, idx) => ({ "@type": "ListItem", "position": idx + 1, "item": item }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamic-property-list-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}
