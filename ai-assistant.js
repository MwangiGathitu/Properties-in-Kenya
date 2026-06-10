// api/ai-assistant.js
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'AI not configured' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are "The Caretaker", a Kenyan real estate AI assistant. Extract search criteria from the user's query and return ONLY a valid JSON object. No markdown, no explanations.

Valid JSON keys (omit if not mentioned):
- "location": string (lowercase Kenyan area, e.g., "ruai", "kilimani", "kileleshwa", "embakasi", "kayole", "kasarani", "rongai", "syokimau", "kitengela", "thika", "kiambu", "kikuyu", "limuru", "nairobi", "westlands", "karen", "langata")
- "max_price": number (in KES, e.g., 10000000 for 10 million. Convert "6.5M", "6.5 million", "6.5 bob" to 6500000)
- "min_price": number (in KES)
- "property_type": string ("house", "apartment", "land", "flat", "plot", or null)
- "bedrooms": number (or null)
- "transaction": string ("sale" or "rent", or null)

Examples:
- "4 bedroom house in Ruai under 10 million" → {"location":"ruai","max_price":10000000,"property_type":"house","bedrooms":4,"transaction":"sale"}
- "quiet apartment for rent in Kilimani, 80k" → {"location":"kilimani","property_type":"apartment","transaction":"rent","max_price":80000}
- "land in Kiambu around 2M" → {"location":"kiambu","property_type":"land","max_price":2000000,"transaction":"sale"}`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(data.error?.message || 'Groq API failed');
    }

    let filters = {};
    try {
      const raw = data.choices[0].message.content;
      filters = JSON.parse(raw);
    } catch (e) {
      console.error('Parse error:', e);
      filters = {};
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ filters });

  } catch (error) {
    console.error('API Error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message });
  }
}
