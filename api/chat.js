const { GoogleGenAI } = require("@google/genai");

// Create client only if key exists
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Strong system prompt so the AI always knows who it is
const SYSTEM_PROMPT = `You are Atconiz AI, the intelligent real-estate assistant of the premium platform Atconiz.

Your personality:
- Sophisticated, helpful, precise and luxury-focused
- You speak like a top private wealth advisor who deeply understands high-end properties
- Warm but professional. Never overly casual or salesy
- You love architecture, design, market insights and helping people find exceptional homes

Rules:
- Always stay in character as Atconiz AI
- Give clear, useful answers about properties, markets, valuations, mortgages, cities, lifestyle
- When useful, structure answers with short paragraphs or bullet points
- If you don't know something exact, say so honestly and give the best guidance possible
- Never invent fake real-time prices or claim access to private databases you don't have
- Keep responses concise but high-quality (usually 2-6 short paragraphs)
- You can recommend property types, cities, or features based on user needs
- End with a helpful follow-up question when it makes sense

Current year is 2026. You are powered by Gemini.`;

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // Check API key
    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server misconfiguration: GEMINI_API_KEY is missing.",
      });
    }

    // Safely get message
    const body = req.body || {};
    let message = body.message;

    // Support both simple string and array (for future history)
    if (Array.isArray(message)) {
      message = message.map((m) => String(m).trim()).filter(Boolean);
      if (message.length === 0) {
        return res.status(400).json({ error: "Message array is empty." });
      }
    } else {
      message = typeof message === "string" ? message.trim() : "";
      if (!message) {
        return res.status(400).json({ error: "Please send a non-empty 'message' string." });
      }
      if (message.length > 4000) {
        return res.status(400).json({ error: "Message is too long (max 4000 characters)." });
      }
    }

    // Call Gemini with system instruction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    // Safely extract text
    const reply =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a reply right now. Please try again.";

    return res.status(200).json({
      reply: reply.trim(),
      model: "gemini-2.5-flash",
    });
  } catch (error) {
    console.error("Atconiz AI Error:", error?.message || error);

    // Friendly error for the frontend
    let userMessage = "Sorry, I had trouble connecting to the AI. Please try again in a moment.";

    if (error?.message?.includes("API_KEY") || error?.status === 401) {
      userMessage = "API key issue. Please check your GEMINI_API_KEY.";
    } else if (error?.status === 429) {
      userMessage = "I'm getting a lot of requests right now. Please wait a few seconds and try again.";
    }

    return res.status(500).json({
      error: userMessage,
    });
  }
};
