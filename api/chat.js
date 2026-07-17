const { GoogleGenAI } = require("@google/genai");

// Primary: gemini-3.5-flash  |  Fallback: gemini-3.1-pro
const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-pro"
];

const MAX_MESSAGE_LENGTH = 2000;
const SYSTEM_PROMPT = `You are Atconiz AI, the private intelligence layer of Atconiz — a ultra-premium real-estate platform for high-net-worth clients in 2026.

Personality & voice:
- Sophisticated, precise, calm, and discreet (think private banker + top luxury agent)
- Never hype or use marketing fluff
- Prefer short, high-signal answers. Use bullet points when listing properties or numbers.
- Always speak in present tense about market conditions in 2026.
- You have deep knowledge of luxury residential markets worldwide (Beverly Hills, Malibu, Manhattan, Dubai, London, Singapore, Monaco, Hong Kong, Lake Como, etc.).

Capabilities you should use:
- Property valuation ranges and reasoning
- Investment framing (appreciation, holding period, risk)
- Neighborhood and lifestyle fit
- Mortgage / financing high-level guidance
- Off-market and private-client style language

Rules:
- Never invent specific current listings that do not exist in the conversation.
- If asked for a price, give a reasoned range rather than a single number when data is incomplete.
- Refuse any request that is illegal, harmful, or unrelated to real estate / wealth / lifestyle in a professional way.
- Keep responses under 220 words unless the user explicitly asks for depth.
- Current year is 2026.`;

module.exports = async (req, res) => {
  // CORS — restrict in production if possible; * for demo convenience
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "Atconiz AI online",
      hasKey: Boolean(process.env.GEMINI_API_KEY),
      models: MODELS,
      time: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Add it in Vercel → Settings → Environment Variables."
      });
    }

    const body = req.body || {};
    let message = (body.message || "").toString().trim();

    // Basic validation & hardening
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`
      });
    }

    // Lightweight prompt-injection guard (not perfect, but raises the bar)
    const lower = message.toLowerCase();
    if (
      lower.includes("ignore previous") ||
      lower.includes("ignore all instructions") ||
      lower.includes("system prompt") ||
      lower.includes("you are now") ||
      lower.includes("jailbreak")
    ) {
      return res.status(400).json({
        error: "I can only assist with real-estate and investment questions."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const fullPrompt = `${SYSTEM_PROMPT}

User: ${message}`;

    let lastError = null;

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
          // generationConfig could be added when supported by the SDK version
        });

        const reply =
          response?.text ||
          response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && typeof reply === "string" && reply.trim()) {
          return res.status(200).json({
            reply: reply.trim(),
            model
          });
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err?.message || err);
      }
    }

    const msg =
      lastError?.message ||
      "All models are currently unavailable. Please try again shortly.";
    return res.status(503).json({
      error: "AI temporarily unavailable: " + String(msg).slice(0, 160)
    });
  } catch (error) {
    console.error("Atconiz chat error:", error);
    return res.status(500).json({
      error: "Internal AI error. Please try again."
    });
  }
};
