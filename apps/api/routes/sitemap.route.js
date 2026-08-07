// api/sitemap.js
import { createClient } from '@supabase/supabase-js';

/**
 * Custom error class to distinguish timeouts from database errors.
 */
class SitemapTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SitemapTimeoutError';
  }
}

// Safe monotonic time getter to prevent NTP clock drift issues
const getNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Safely escapes XML entities and strips illegal XML 1.0 control characters.
 */
function escapeXml(unsafe) {
  if (!unsafe) return '';
  const cleaned = String(unsafe).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Safely parses a date string, returning a fallback if invalid.
 */
function getSafeISODate(dateString, fallback) {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

/**
 * Fetches records in chunks of 1000. 
 * Uses a shared client and mutable signal reference to kill TCP connections on timeout.
 */
async function fetchAllRecords(queryFactory, supabase, setSignal, startTime, maxTotalTimeMs = 6000) {
  const allRecords = [];
  let from = 0;
  let to = 999;
  let hasMore = true;

  while (hasMore) {
    const elapsed = getNow() - startTime;
    if (elapsed > maxTotalTimeMs) {
      throw new SitemapTimeoutError('Sitemap pagination time limit reached.');
    }
    
    const remainingTime = maxTotalTimeMs - elapsed;
    const controller = new AbortController();
    setSignal(controller.signal);
    
    const timeoutId = setTimeout(() => controller.abort(), remainingTime);

    try {
      const query = queryFactory(supabase).range(from, to);
      const { data, error } = await query;
      clearTimeout(timeoutId);
      setSignal(null);
      
      if (error) {
        if (controller.signal.aborted) throw new SitemapTimeoutError('Database query timed out');
        throw error;
      }
      
      if (data && data.length > 0) {
        allRecords.push(...data); // O(1) amortized, prevents GC death spiral
      }
      
      if (!data || data.length < 1000) {
        hasMore = false;
      } else {
        from += 1000;
        to += 1000;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setSignal(null);
      if (controller.signal.aborted || err.name === 'AbortError') {
        throw new SitemapTimeoutError('Database query timed out');
      }
      throw err;
    }
  }
  
  return allRecords;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Strict Base URL Validation (Prevents Host Header Injection)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    console.error('CRITICAL: NEXT_PUBLIC_SITE_URL is not set. Sitemap generation aborted.');
    return res.status(500).send('Server misconfiguration');
  }
  
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables for sitemap generation.');
    return res.status(500).send('Server misconfiguration');
  }

  // Instantiate client ONCE to prevent memory/connection overhead in loops
  let currentSignal = null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, signal: currentSignal })
    }
  });
  const setSignal = (sig) => { currentSignal = sig; };

  const currentDate = new Date().toISOString();
  const startTime = getNow();

  let properties = [];
  let agents = [];

  // Reduced DB timeout to 6s to reserve 4s for XML serialization and network flush
  const DB_TIMEOUT_BUDGET = 6000; 

  // 2. Fetch approved properties (Critical)
  try {
    const propertiesQueryFactory = (sb) => sb
      .from('properties')
      .select('id, updated_at')
      .eq('approval_status', 'approved')
      .order('id', { ascending: true });
      
    properties = await fetchAllRecords(propertiesQueryFactory, supabase, setSignal, startTime, DB_TIMEOUT_BUDGET);
  } catch (error) {
    if (error instanceof SitemapTimeoutError) {
      console.error('Sitemap generation timed out during properties fetch.');
      return res.status(504).send('Sitemap generation timed out');
    }
    console.error('Failed to fetch properties:', error.message);
    return res.status(500).send('Failed to generate sitemap');
  }

  // 3. Fetch verified agents (Non-critical, isolated)
  try {
    if (getNow() - startTime > DB_TIMEOUT_BUDGET) {
       throw new SitemapTimeoutError('Sitemap time limit reached before agents fetch.');
    }

    const agentsQueryFactory = (sb) => sb
      .from('profiles')
      .select('id, updated_at') 
      .eq('role', 'agent')
      .eq('is_licensed_agent', true)
      .order('id', { ascending: true });
      
    agents = await fetchAllRecords(agentsQueryFactory, supabase, setSignal, startTime, DB_TIMEOUT_BUDGET);
  } catch (error) {
    if (error instanceof SitemapTimeoutError) {
      console.error('Sitemap generation timed out during agents fetch.');
      return res.status(504).send('Sitemap generation timed out');
    }
    
    // Differentiate schema errors from transient network/DB errors
    const isSchemaError = 
      error?.code === 'PGRST204' || 
      error?.code === '42703' || 
      /column .* does not exist/i.test(error?.message || '') ||
      /relation .* does not exist/i.test(error?.message || '');

    if (isSchemaError) {
      console.warn('Failed to fetch agents (schema mismatch/missing column):', error.message);
    } else {
      console.error('Failed to fetch agents (transient error):', error.message);
      return res.status(500).send('Failed to generate sitemap');
    }
  }

  // Vercel Hobby/Pro payload limit is ~4.5MB. 
  // ~25,000 URLs * ~160 bytes = ~4MB. This prevents the 4.5MB hard crash.
  // We defer a full Sitemap Index to avoid unjustified complexity at the early stage.
  const MAX_URLS = 25000; 
  const totalCount = properties.length + agents.length;
  
  if (totalCount > MAX_URLS) {
    console.warn(`WARNING: Sitemap exceeds ${MAX_URLS} URLs (Vercel payload limit guard). Truncating. A Sitemap Index will be required for future scale.`);
    const overflow = totalCount - MAX_URLS;
    if (agents.length >= overflow) {
      agents.length = agents.length - overflow; 
    } else {
      const propOverflow = overflow - agents.length;
      agents.length = 0;
      properties.length = properties.length - propOverflow;
    }
  }

  // 4. Build XML in memory
  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
    `  <url>\n    <loc>${escapeXml(normalizedBaseUrl)}/</loc>\n    <lastmod>${currentDate}</lastmod>\n  </url>\n`,
    `  <url>\n    <loc>${escapeXml(normalizedBaseUrl)}/agents.html</loc>\n    <lastmod>${currentDate}</lastmod>\n  </url>\n`
  ];

  for (const p of properties) {
    const lastmod = getSafeISODate(p.updated_at, currentDate);
    const encodedId = encodeURIComponent(p.id);
    xmlParts.push(`  <url>\n    <loc>${escapeXml(normalizedBaseUrl)}/property.html?id=${escapeXml(encodedId)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`);
  }

  for (const a of agents) {
    const lastmod = getSafeISODate(a.updated_at, currentDate);
    const encodedId = encodeURIComponent(a.id);
    xmlParts.push(`  <url>\n    <loc>${escapeXml(normalizedBaseUrl)}/agent-profile.html?id=${escapeXml(encodedId)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`);
  }

  xmlParts.push('</urlset>');

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=60');
  res.status(200).send(xmlParts.join(''));
}
