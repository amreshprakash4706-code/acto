const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// This prompt is prepended so the model always stays in character
const SYSTEM_PROMPT = `You are Atconiz AI, the premium real-estate intelligence assistant of the Atconiz platform.

Personality: sophisticated, helpful, precise, luxury-focused, like a top private client advisor. Warm but professional.

Rules:
- Always stay in character as Atconiz AI
- Give clear, useful answers about properties, markets, valuations, mortgages, cities and lifestyle
- Structure answers nicely when helpful (short paragraphs or bullets)
- Be honest if you don't know exact real-time numbers
- Keep responses high-quality but not too long
- Current year is 2026

Now answer the user:`;

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing on the server. Please add it in Vercel Environment Variables.",
      });
    }

    // Get message safely
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const userMessage = (body.message || "").toString().trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Please send a message." });
    }

    if (userMessage.length > 3500) {
      return res.status(400).json({ error: "Message is too long." });
    }

    // Simple + reliable call (works with current @google/genai)
    const fullPrompt = SYSTEM_PROMPT + "\n\nUser: " + userMessage;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    // Extract text safely
    let reply = "";
    if (response && typeof response.text === "string") {
      reply = response.text;
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      reply = response.candidates[0].content.parts[0].text;
    } else {
      reply = "I received your message but couldn't generate a proper reply. Please try again.";
    }

    return res.status(200).json({
      reply: reply.trim(),
    });
  } catch (error) {
    console.error("Atconiz AI Error:", error);

    // Send the real error message so we can debug
    const msg = error?.message || String(error) || "Unknown error";

    return res.status(500).json({
      error: "AI Error: " + msg.substring(0, 200),
    });
  }
};
