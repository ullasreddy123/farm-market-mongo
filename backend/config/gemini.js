const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set — the AI assistant will not work.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.0-flash";

module.exports = { genAI, MODEL_NAME };
