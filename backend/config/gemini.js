const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function getGeminiClient() {
  if (!apiKey) {
    const err = new Error(
      "Gemini is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend."
    );
    err.code = "GEMINI_API_KEY_MISSING";
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

module.exports = { getGeminiClient, MODEL_NAME };
