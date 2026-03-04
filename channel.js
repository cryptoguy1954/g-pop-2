// netlify/functions/channel.js
// G-PoP Secure API v2 — set ANTHROPIC_API_KEY in Netlify environment variables

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { channel, query, action } = JSON.parse(event.body || '{}');
    if (!channel || !action) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing params' }) };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 200, headers, body: JSON.stringify(action === 'taste_dna' ? { recommendations: getMockDNA() } : getMockData(channel)) };
    }

    const isDNA = action === 'taste_dna';
    const system = isDNA
      ? 'You are a world-class music curator. Given a list of favorite artists, you map the listener\'s musical DNA and recommend new artists, specific songs, albums, and playlist vibes. Always respond with valid JSON only, no markdown.'
      : getSystemPrompt(channel);

    const userMsg = isDNA
      ? `My top favorite artists are: ${query}.
Analyze my music taste and generate personalized recommendations.
Return ONLY this JSON (no markdown):
{
  "recommendations": {
    "artists": [ { "name": "...", "meta": "Genre · Location", "why": "one sentence reason", "searchQuery": "artist name" } ],
    "songs": [ { "name": "Song Title", "meta": "Artist Name", "why": "one sentence reason", "searchQuery": "artist song title" } ],
    "albums": [ { "name": "Album Title", "meta": "Artist · Year", "why": "one sentence reason", "searchQuery": "artist album title" } ],
    "vibes": [ { "name": "Vibe/Playlist Name", "meta": "A playlist vibe", "why": "one sentence reason", "searchQuery": "descriptive playlist search terms" } ]
  }
}
Return 4 items in each category. Make them genuinely tailored to the specific artists provided.`
      : getUserPrompt(channel, action, query);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 1500, system, messages: [{ role: 'user', content: userMsg }] }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const text = data.content[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      parsed = isDNA ? { recommendations: getMockDNA() } : getMockData(channel);
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('G-PoP error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};

function getSystemPrompt(ch) {
  const p = {
    music: 'You are a warm music curator for G-PoP. JSON only.',
    art: 'You are a passionate art guide for G-PoP. JSON only.',
    home: 'You are a cozy home design enthusiast for G-PoP. JSON only.',
    film: 'You are a cinephile curator for G-PoP. JSON only.',
    books: 'You are a warm book recommender for G-PoP. JSON only.',
  };
  return p[ch] || p.music;
}

function getUserPrompt(ch, action, query) {
  const schema = `{ "items": [ { "id": "1", "title": "...", "subtitle": "...", "description": "...", "tags": ["tag1","tag2"], "mood": "emoji word", "rating": 4.5 } ] }`;
  if (action === 'search') return `Search G-PoP ${ch} for: "${query}". Return 4 results. Schema: ${schema} No markdown.`;
  return `Generate 6 ${action === 'trending' ? 'trending' : 'curated'} ${ch} items. Schema: ${schema} No markdown.`;
}

function getMockDNA() {
  return {
    artists: [
      { name: 'Janelle Monáe', meta: 'Afrofuturist R&B · Atlanta', why: 'Genre-blending fearlessness that matches your eclectic taste', searchQuery: 'Janelle Monáe' },
      { name: 'Blood Orange', meta: 'Dev Hynes · Art R&B', why: 'Cinematic and emotionally layered — made for curious ears', searchQuery: 'Blood Orange Dev Hynes' },
      { name: 'Hiatus Kaiyote', meta: 'Future Soul · Melbourne', why: 'Intricate grooves and lush arrangements your taste demands', searchQuery: 'Hiatus Kaiyote' },
      { name: 'Bon Iver', meta: 'Indie Folk · Wisconsin', why: 'Textural and deeply felt — a natural sonic evolution', searchQuery: 'Bon Iver' },
    ],
    songs: [
      { name: 'Make Me Feel', meta: 'Janelle Monáe', why: 'Prince-influenced funk meets modern R&B perfection', searchQuery: 'Janelle Monáe Make Me Feel' },
      { name: 'Champagne Coast', meta: 'Blood Orange', why: 'Dreamy nostalgia that hits like a warm memory', searchQuery: 'Blood Orange Champagne Coast' },
      { name: 'Breathing Underwater', meta: 'Hiatus Kaiyote', why: 'Complex rhythm and melody woven into something beautiful', searchQuery: 'Hiatus Kaiyote Breathing Underwater' },
      { name: 'Holocene', meta: 'Bon Iver', why: 'Expansive and intimate all at once — genuinely unforgettable', searchQuery: 'Bon Iver Holocene' },
    ],
    albums: [
      { name: 'Dirty Computer', meta: 'Janelle Monáe · 2018', why: 'A concept album that rewards every relisten', searchQuery: 'Janelle Monáe Dirty Computer album' },
      { name: 'Negro Swan', meta: 'Blood Orange · 2018', why: 'Deeply personal and musically adventurous', searchQuery: 'Blood Orange Negro Swan album' },
      { name: 'Choose Your Weapon', meta: 'Hiatus Kaiyote · 2015', why: 'The album that showed the world what future soul could be', searchQuery: 'Hiatus Kaiyote Choose Your Weapon album' },
      { name: 'For Emma, Forever Ago', meta: 'Bon Iver · 2007', why: 'A landmark record that still sounds unlike anything else', searchQuery: 'Bon Iver For Emma Forever Ago album' },
    ],
    vibes: [
      { name: 'Late Night Introspection', meta: 'A playlist vibe', why: 'For when you want to feel something real at 1am', searchQuery: 'late night introspective indie soul playlist' },
      { name: 'Sunday Morning Jazz-Soul', meta: 'A playlist vibe', why: 'Warm, unhurried, and full of feeling', searchQuery: 'sunday morning jazz soul neo soul playlist' },
      { name: 'Genre-Defying Brilliance', meta: 'A playlist vibe', why: 'Artists who refuse to be boxed in — like your favorites', searchQuery: 'genre defying alternative R&B experimental playlist' },
      { name: 'Emotional Maximalism', meta: 'A playlist vibe', why: 'Big feelings, big sounds, big ideas', searchQuery: 'emotional maximalist indie art pop playlist' },
    ],
  };
}

function getMockData(channel) {
  const data = {
    music: { items: [
      { id:'1', title:'Afrobeats Rising', subtitle:'Various Artists · 2024', description:'A vibrant collection celebrating the global explosion of Afrobeats.', tags:['Afrobeats','Global','Dance'], mood:'🔥 Energetic', rating:4.8 },
      { id:'2', title:'Quiet Storm Vol. 3', subtitle:'Neo-Soul Collective', description:'Late-night soul for contemplative evenings.', tags:['Neo-Soul','Jazz','Chill'], mood:'🌙 Dreamy', rating:4.6 },
      { id:'3', title:'Flamenco Nuevo', subtitle:'Esperanza Ruiz · Live', description:'Flamenco reimagined with electronic textures.', tags:['Flamenco','Electronic','World'], mood:'💃 Passionate', rating:4.7 },
      { id:'4', title:'Bedroom Pop Diaries', subtitle:'Indie Collective 2024', description:'Intimate lo-fi recordings from bedroom producers.', tags:['Indie','Lo-fi','Pop'], mood:'☁️ Cozy', rating:4.5 },
      { id:'5', title:'Jazz in Kyoto', subtitle:'Hiroshi Tanaka Trio', description:'Modal jazz inspired by traditional Japanese music.', tags:['Jazz','Japanese','Ambient'], mood:'🍵 Meditative', rating:4.9 },
      { id:'6', title:'Cumbia del Futuro', subtitle:'Electro-Cumbia All Stars', description:'Colombian cumbia meets hypnotic electronics.', tags:['Cumbia','Electronic','Latin'], mood:'🎉 Festive', rating:4.7 },
    ]},
  };
  return data[channel] || data.music;
}
