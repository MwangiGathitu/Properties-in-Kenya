// api/sitemap.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Use Service Role Key here to bypass RLS and read all approved data
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY 
    );

    const baseUrl = 'https://propertiesinkenya.co.ke';
    const currentDate = new Date().toISOString();

    // 1. Fetch approved properties
    const { data: properties } = await supabase
        .from('properties')
        .select('id, updated_at')
        .eq('approval_status', 'approved');

    // 2. Fetch verified agents
    const { data: agents } = await supabase
        .from('profiles')
        .select('id, slug, updated_at')
        .eq('role', 'agent')
        .eq('is_verified', true);

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    xml += `<url><loc>${baseUrl}/</loc><lastmod>${currentDate}</lastmod></url>`;
    xml += `<url><loc>${baseUrl}/agents.html</loc><lastmod>${currentDate}</lastmod></url>`;

    // Add dynamic property pages
    if (properties) {
        properties.forEach(p => {
            const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : currentDate;
            xml += `<url><loc>${baseUrl}/property.html?id=${p.id}</loc><lastmod>${lastmod}</lastmod></url>`;
        });
    }

    // Add dynamic agent profile pages
    if (agents) {
        agents.forEach(a => {
            const lastmod = a.updated_at ? new Date(a.updated_at).toISOString() : currentDate;
            // Use slug if available, otherwise fallback to ID
            const agentUrl = a.slug ? `${baseUrl}/agent/${a.slug}` : `${baseUrl}/agent-profile.html?id=${a.id}`;
            xml += `<url><loc>${agentUrl}</loc><lastmod>${lastmod}</lastmod></url>`;
        });
    }

    xml += `</urlset>`;

    // Set correct headers for XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=60'); // Cache for 1 hour
    res.status(200).send(xml);
}
