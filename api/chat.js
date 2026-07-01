const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
 module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    const { message } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    res.status(200).json({
      reply: response.text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to generate response.",
    });
  }
};