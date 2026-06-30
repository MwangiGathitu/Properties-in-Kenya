// middleware.js

export default async function middleware(request) {
    // 1. Prevent infinite loops when fetching the original HTML
    if (request.headers.get('x-internal-fetch')) {
        return fetch(request);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // 2. Check if the request is from a social media bot
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot/i.test(userAgent);
    
    // 3. Only intercept if it's a bot and we have a property ID
    if (id && isBot) {
        try {
            const supabaseUrl = 'https://nqwvsmuvltbiekfnvovx.supabase.co';
            const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd3ZzbXV2bHRiaWVrZm52b3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjU4MDAsImV4cCI6MjA5NjE0MTgwMH0.Xrc-bbAuWdvKSPHnVhTaLiQphV61xeYtDepWePqsrdo';

            // Fetch property data from Supabase
            const res = await fetch(`${supabaseUrl}/rest/v1/properties?id=eq.${id}&select=title,description,price,location,images`, {
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                }
            });
            
            const data = await res.json();
            
            if (data && data.length > 0) {
                const prop = data[0];
                const title = `${prop.title} | ${prop.location || 'Kenya'} | KES ${Number(prop.price).toLocaleString()}`;
                const desc = prop.description || title;
                const img = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80';
                
                // Fetch the original HTML page with a custom header to bypass middleware
                const internalHeaders = new Headers(request.headers);
                internalHeaders.set('x-internal-fetch', 'true');
                
                const response = await fetch(request.url, { headers: internalHeaders });
                let html = await response.text();
                
                // Inject the dynamic meta tags for the bot
                html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
                html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${desc.substring(0, 160)}">`);
                html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title}">`);
                html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${desc.substring(0, 160)}">`);
                html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${img}">`);
                
                return new Response(html, {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                });
            }
        } catch (error) {
            console.error('Middleware error:', error);
        }
    }
    
    // 4. If it's a normal user, or no data is found, just pass the request through normally
    return fetch(request);
}

export const config = {
    matcher: ['/property.html', '/property/:path*']
};
