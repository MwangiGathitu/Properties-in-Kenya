/**
 * RealtorOS API Health Check
 *
 * Purpose:
 * - Verify that the Vercel API layer is online.
 * - Provide a lightweight endpoint for monitoring and debugging.
 *
 * Endpoint:
 * GET /api/health
 */

export default function handler(req, res) {
  // Prevent search engines from indexing this utility endpoint
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  
  // Ensure monitoring tools always hit the live function, not a cached edge response
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method !== "GET") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
    });
  }

  return res.status(200).json({
    status: "ok",
    service: "RealtorOS API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  });
}
