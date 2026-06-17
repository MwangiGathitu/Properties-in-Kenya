// middleware.js
import { NextResponse } from 'next/server';

export const config = { matcher: '/property.html' };

export async function middleware(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // Only intercept if it's a bot (WhatsApp, Facebook, Twitter, etc.)
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot/i.test(userAgent);

    if (id && isBot) {
        // Fetch property data from Supabase Edge
        const res = await fetch(`https://nqwvsmuvltbiekfnvovx.supabase.co/rest/v1/properties?id=eq.${id}&select=title,description,price,location,images`, {
            headers: {
                'apikey': 'YOUR_SUPABASE_ANON_KEY',
                'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
            }
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
            const prop = data[0];
            const title = `${prop.title} | ${prop.location} | KES ${prop.price}`;
            const desc = prop.description || title;
            const img = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80';
            
            // Fetch original HTML and inject meta tags
            const response = await fetch(request.url);
            let html = await response.text();
            
            html = html.replace('<meta property="og:title" content="Property Details | Properties in Kenya">', `<meta property="og:title" content="${title}">`);
            html = html.replace('<meta property="og:description" content="View property details, photos, and contact the listing agent.">', `<meta property="og:description" content="${desc.substring(0, 160)}">`);
            html = html.replace('<meta property="og:image" content="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80">', `<meta property="og:image" content="${img}">`);
            
            return new NextResponse(html, {
                status: 200,
                headers: { 'content-type': 'text/html' },
            });
        }
    }
    
    return NextResponse.next();
}
