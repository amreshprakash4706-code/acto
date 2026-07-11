const { GoogleGenAI } = require("@google/genai");

// Only these two models for fast & reliable responses (newest flash first)
const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite"
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "Atconiz AI is alive",
      hasKey: !!process.env.GEMINI_API_KEY,
      models: MODELS,
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

    const prompt = `You are Atconiz AI, a sophisticated luxury real-estate assistant for the Atconiz platform. Be helpful, professional, precise and concise. Current year is 2026.

User question: ${message}`;

    let lastError = null;

    // Try each model until one works
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });

        const reply = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && reply.trim()) {
          return res.status(200).json({
            reply: reply.trim(),
            model: model   // so you can see which one worked
          });
        }
      } catch (err) {
        lastError = err;
        console.log(`Model ${model} failed:`, err?.message || err);
        // continue to next model
      }
    }

    // All models failed
    const msg = lastError?.message || "All models are currently busy. Please try again in a few seconds.";
    return res.status(503).json({
      error: "AI temporarily unavailable: " + msg.substring(0, 180)
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "AI Error: " + (error.message || "Unknown error").substring(0, 200)
    });
  }
};
