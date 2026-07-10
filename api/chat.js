const { GoogleGenAI } = require("@google/genai");

module.exports = async (req, res) => {
  // Always set CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Quick health check
  if (req.method === "GET") {
    return res.status(200).json({
      status: "Atconiz AI is alive",
      hasKey: !!process.env.GEMINI_API_KEY,
      model: "gemini-3.5-flash",
      time: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Add it in Vercel → Settings → Environment Variables"
      });
    }

    const body = req.body || {};
    const message = (body.message || "").toString().trim();

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `You are Atconiz AI, a sophisticated real-estate assistant for the luxury platform Atconiz. Be helpful, professional, precise and concise. Current year is 2026.

User question: ${message}`;

    // Using the current recommended model (gemini-2.5-flash is restricted for new users)
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const reply = response.text || "I couldn't generate a reply. Please try again.";

    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    console.error(error);

    // If 3.5 fails, try a fallback model
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fallback = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: `You are Atconiz AI, a helpful luxury real-estate assistant (2026). User: ${message}`,
      });
      const reply = fallback.text || "Sorry, I had trouble generating a reply.";
      return res.status(200).json({ reply: reply.trim() });
    } catch (fallbackError) {
      return res.status(500).json({
        error: "AI Error: " + (error.message || "Unknown error").substring(0, 220)
      });
    }
  }
};
