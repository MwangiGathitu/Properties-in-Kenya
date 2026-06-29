async function loadHomepageData() {
    const carousel = document.getElementById('featuredCarousel');
    
    // Show skeleton loaders
    carousel.innerHTML = Array(4).fill(`
        <div class="skeleton-featured-card">
            <div class="skeleton-featured-image"></div>
            <div class="skeleton-featured-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-location"></div>
                <div class="skeleton-price"></div>
                <div class="skeleton-meta">
                    <div class="skeleton-meta-item"></div>
                    <div class="skeleton-meta-item"></div>
                </div>
            </div>
        </div>
    `).join('');

    try {
        // Fetch properties - try multiple table name variations
        let properties = [];
        let error = null;
        
        // Try 'properties' table first
        const result = await supabaseClient
            .from("properties")
            .select("*")
            .eq("approval_status", "approved")
            .order("created_at", { ascending: false })
            .limit(20);
        
        properties = result.data || [];
        error = result.error;
        
        if (error) {
            console.error('Supabase error:', error);
            // Try alternative table name
            const altResult = await supabaseClient
                .from("listings")
                .select("*")
                .eq("status", "approved")
                .order("created_at", { ascending: false })
                .limit(20);
            
            if (!altResult.error) {
                properties = altResult.data || [];
                error = null;
            }
        }

        if (error) throw error;
        state.allProperties = properties;

        // Fetch counts
        let saleCount = 0, rentCount = 0, leaseCount = 0, allCount = 0;
        
        try {
            const [saleRes, rentRes, leaseRes, allRes] = await Promise.all([
                supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'for sale'),
                supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'for rent'),
                supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('property_type', 'lease'),
                supabaseClient.from('properties').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved')
            ]);
            
            saleCount = saleRes.count || 0;
            rentCount = rentRes.count || 0;
            leaseCount = leaseRes.count || 0;
            allCount = allRes.count || 0;
        } catch (countError) {
            console.warn('Count fetch failed, using fallback:', countError);
            allCount = properties.length;
        }

        // Update old category counts (if elements exist)
        const countAllEl = document.getElementById('count-all');
        if (countAllEl) countAllEl.textContent = `${allCount} properties`;
        
        const countSaleEl = document.getElementById('count-sale');
        if (countSaleEl) countSaleEl.textContent = `${saleCount} properties`;
        
        const countRentEl = document.getElementById('count-rent');
        if (countRentEl) countRentEl.textContent = `${rentCount} properties`;
        
        const countLeaseEl = document.getElementById('count-lease');
        if (countLeaseEl) countLeaseEl.textContent = `${leaseCount} properties`;

        // Update HouGarden-style category cards
        const catJustListed = document.getElementById('catJustListed');
        if (catJustListed) catJustListed.textContent = allCount.toLocaleString();
        
        const catForSale = document.getElementById('catForSale');
        if (catForSale) catForSale.textContent = saleCount.toLocaleString();
        
        const catForRent = document.getElementById('catForRent');
        if (catForRent) catForRent.textContent = rentCount.toLocaleString();
        
        const catLand = document.getElementById('catLand');
        if (catLand) catLand.textContent = Math.floor(allCount * 0.3).toLocaleString();
        
        const catCommercial = document.getElementById('catCommercial');
        if (catCommercial) catCommercial.textContent = leaseCount.toLocaleString();

        // Update stats with animation
        animateValue('statProperties', allCount);
        document.getElementById('statAgents').textContent = "150+";
        document.getElementById('statAgents').classList.remove('loading');
        document.getElementById('statSearches').textContent = "12k+";
        document.getElementById('statSearches').classList.remove('loading');

        renderFeatured(properties);
        updateFavoritesCount();
        injectPropertyListSchema();

    } catch (error) {
        console.error('Error loading homepage:', error);
        carousel.innerHTML = `
            <div style="padding:60px; text-align:center; color:#9CA3AF; width:100%; grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle" style="font-size:32px; margin-bottom:16px; display:block;"></i>
                <h3 style="font-size:18px; font-weight:600; color:#6B7280; margin-bottom:8px;">Unable to load properties</h3>
                <p style="font-size:14px;">Please refresh the page or check your connection</p>
            </div>
        `;
    }
}

function animateValue(elementId, end) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.remove('loading');
    element.textContent = end.toLocaleString();
}

function renderFeatured(properties) {
    const carousel = document.getElementById('featuredCarousel');
    
    if (!properties || properties.length === 0) {
        carousel.innerHTML = `
            <div style="padding:60px; text-align:center; color:#9CA3AF; width:100%; grid-column: 1/-1;">
                <i class="fas fa-home" style="font-size:40px; margin-bottom:16px; display:block; color:#D1D5DB;"></i>
                <h3 style="font-size:18px; font-weight:600; color:#6B7280; margin-bottom:8px;">No properties yet</h3>
                <p style="font-size:14px;">Check back soon for featured listings</p>
            </div>
        `;
        return;
    }
    
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        const isFav = getFavorites().includes(p.id);
        const propertyUrl = `/property/${p.id}`;
        
        return `
        <article class="featured-card" onclick="window.location.href='${propertyUrl}'">
            <div style="position:relative; overflow:hidden;">
                <img src="${escapeHtml(img)}" class="featured-image" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'">
                <div class="featured-badge">${escapeHtml((p.property_type || 'FOR SALE').toUpperCase())}</div>
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); toggleFavorite('${p.id}', this)">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="featured-info">
                <h3 class="featured-title">${escapeHtml(p.title || 'Untitled Property')}</h3>
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
    
    if (properties.length === 0) {
        carousel.innerHTML = '<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.8); width:100%;">No properties match your search</div>';
        section.classList.add('active');
        return;
    }
    
    carousel.innerHTML = properties.map(p => {
        const img = getSafeImage(p);
        const propertyUrl = `/property/${p.id}`;
        return `
        <article class="ai-result-card" onclick="window.location.href='${propertyUrl}'">
            <img src="${escapeHtml(img)}" class="ai-result-image" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'">
            <div class="ai-result-info">
                <h3 class="ai-result-title">${escapeHtml(p.title || 'Untitled')}</h3>
                <div class="ai-result-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.location || 'Kenya')}</div>
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
        "name": p.title || 'Property in Kenya',
        "description": (p.description || '').substring(0, 200),
        "url": `https://propertiesinkenya.co.ke/property/${p.id}`,
        "image": getSafeImage(p),
        "address": { 
            "@type": "PostalAddress", 
            "addressLocality": p.location || "Nairobi", 
            "addressCountry": "KE" 
        },
        "offers": { 
            "@type": "Offer", 
            "price": p.price, 
            "priceCurrency": "KES" 
        }
    }));
    
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Properties in Kenya Listings",
        "itemListElement": listings.map((item, idx) => ({ 
            "@type": "ListItem", 
            "position": idx + 1, 
            "item": item 
        }))
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamic-property-list-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}
