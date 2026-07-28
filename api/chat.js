const { GoogleGenAI } = require("@google/genai");

// Production model cascade – Gemini 3.6 Flash primary, with sensible fallbacks
const MODELS = ["gemini-3.6-flash"];

const MAX_MESSAGE_LENGTH = 2000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

// Simple in-memory rate limiter (per-instance; fine for serverless cold starts)
const rateBuckets = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

const SYSTEM_PROMPT = `You are Atconiz AI, the private intelligence layer of Atconiz — an ultra-premium real-estate platform for high-net-worth clients in 2026.

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
- Current year is 2026.
- Do not discuss topics inappropriate for a general audience.`;

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
  /\[\s*system\s*\]/i,
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "Atconiz AI online",
      hasKey: Boolean(process.env.GEMINI_API_KEY),
      models: MODELS,
      time: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before trying again.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing. Add it in Vercel → Settings → Environment Variables.",
      });
    }

    const body = req.body || {};
    let message = (body.message || "").toString().trim();

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    if (INJECTION_PATTERNS.some((re) => re.test(message))) {
      return res.status(400).json({
        error: "I can only assist with real-estate and investment questions.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${message}`;

    let lastError = null;

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
        });

        const reply =
          response?.text ||
          response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && typeof reply === "string" && reply.trim()) {
          return res.status(200).json({
            reply: reply.trim().slice(0, 4000),
            model,
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
      error: "AI temporarily unavailable: " + String(msg).slice(0, 160),
    });
  } catch (error) {
    console.error("Atconiz chat error:", error);
    return res.status(500).json({
      error: "Internal AI error. Please try again.",
    });
  }
};
