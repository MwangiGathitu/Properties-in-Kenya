// api/ai-assistant.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    
    // This reads the key securely from Vercel. It is NEVER sent to the browser.
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Call Groq API from the secure server
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Ultra-fast model
        messages: [
          {
            role: 'system',
            content: `You are Mali, a Kenyan real estate AI assistant. 
            Extract search criteria from the user's query and return ONLY a valid JSON object. 
            Do not include markdown formatting (like \`\`\`json) or explanations.
            
            Valid JSON keys:
            - "location": string (lowercase, e.g., "ruai", "kilimani")
            - "max_price": number (in KES, e.g., 10000000)
            - "property_type": string ("house", "apartment", "land", or null)
            - "bedrooms": number (or null)
            - "transaction": string ("sale" or "rent", or null)`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.1, // Keep it strict for reliable JSON
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(data.error?.message || 'Groq API failed');
    }

    // Clean up the AI response to ensure it's valid JSON
    let rawText = data.choices[0].message.content;
    let cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let filters = {};
    try {
      filters = JSON.parse(cleanJson);
    } catch (e) {
      console.error('JSON Parse Error:', cleanJson);
      filters = { error: 'AI returned invalid format' };
    }

    // Send the extracted filters back to your frontend
    return res.status(200).json({ filters });

  } catch (error) {
    console.error('Vercel API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
