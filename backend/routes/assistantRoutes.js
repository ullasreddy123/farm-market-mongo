const express = require("express");
const router = express.Router();
const { getGeminiClient, MODEL_NAME } = require("../config/gemini");
const { buildToolDeclarations, executeTool } = require("../services/assistantTools");
const { attachUserIfPresent } = require("../middleware/authMiddleware");

const LANG_NAMES = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  te: "Telugu",
  ta: "Tamil",
  ml: "Malayalam",
};

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && typeof h.text === "string" && h.text.trim())
    .slice(-20)
    .map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text.trim() }],
    }));
}

// POST /api/assistant/chat
router.post("/chat", attachUserIfPresent, async (req, res) => {
  try {
    const { message, history = [], lang = "en", page = "" } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const client = getGeminiClient();
    const toolDeclarations = await buildToolDeclarations();
    const languageName = LANG_NAMES[lang] || "English";
    const loggedIn = Boolean(req.user);
    const role = req.user?.role || "visitor";

    const systemInstruction = `You are the Farm Market AI Assistant inside a digital farm marketplace in India.
Speak naturally and conversationally in ${languageName}. Understand normal questions, greetings, follow-up questions, spelling mistakes, and mixed English/Indian-language messages.

Current user: ${loggedIn ? `${req.user.username}, role=${role}` : "visitor (not logged in)"}.
Current app page: ${String(page).slice(0, 60)}. If the path starts with /trader, the visitor is a trader: never use startRegistration (it is for farmers only), and tell them to tap Register on this page instead.

You can help with:
- General Farm Market questions and how the app works.
- Crop categories and available crop listings.
- Farmers: adding a crop listing, viewing their listings, and starting registration.
- Traders: finding available crops, comparing basic listing information, and understanding how to place an order.

Important rules:
- Do not claim an action happened unless one of your tools successfully completed it.
- Ask only for information that is actually missing.
- Never ask for or accept a password, OTP, JWT, or API key in chat.
- A farmer must be logged in before addCrop or myListings can be used.
- A trader must be logged in before trader-specific account information is discussed.
- If the user asks something unrelated to Farm Market, answer briefly if it is safe and useful, then offer to help with Farm Market.
- If a tool returns an error, explain the error plainly and give the next useful step.
- Do not expose database IDs, internal errors, API keys, or server implementation details.

For adding a crop, collect and confirm: crop name, category, quantity, unit, and price per unit. Description is optional. You may ask one or two missing questions at a time.
For registration, collect only name and Indian 10-digit phone number; then use startRegistration. Password and OTP must be entered on the secure registration page.`;

    const contents = [
      ...cleanHistory(history),
      { role: "user", parts: [{ text: message.trim() }] },
    ];

    const config = {
      systemInstruction,
      tools: [{ functionDeclarations: toolDeclarations }],
      temperature: 0.5,
    };

    let response = await client.models.generateContent({
      model: MODEL_NAME,
      contents,
      config,
    });

    let toolResultForUi = null;

    // Gemini can request multiple functions over several rounds.
    for (let round = 0; round < 5; round++) {
      const calls = response.functionCalls || [];
      if (!calls.length) break;

      // Preserve Gemini's function-call content exactly before returning results.
      if (response.candidates?.[0]?.content) {
        contents.push(response.candidates[0].content);
      }

      const functionResponseParts = [];
      for (const call of calls) {
        const output = await executeTool(call.name, call.args || {}, { user: req.user });

        if (call.name === "addCrop" && output.success) {
          toolResultForUi = { type: "cropAdded", ...output };
        }
        if (call.name === "startRegistration" && output.success) {
          toolResultForUi = { type: "registration", ...output };
        }

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: output,
            ...(call.id ? { id: call.id } : {}),
          },
        });
      }

      contents.push({ role: "user", parts: functionResponseParts });

      response = await client.models.generateContent({
        model: MODEL_NAME,
        contents,
        config,
      });
    }

    const reply = response.text || "I'm here to help with Farm Market. What would you like to do?";
    return res.json({ reply, toolResult: toolResultForUi });
  } catch (err) {
    console.error("Assistant chat failed:", err);

    if (err.code === "GEMINI_API_KEY_MISSING") {
      return res.status(503).json({
        message: "Gemini is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.",
        code: err.code,
      });
    }

    const status = Number(err.status) || Number(err.httpStatus) || 500;
    const raw = String(err.message || "");

    if (/API key|api_key|invalid.*key|unauthenticated/i.test(raw)) {
      return res.status(502).json({
        message: "Gemini rejected the API key. Create/check your Gemini API key and update backend/.env.",
        code: "GEMINI_AUTH_ERROR",
      });
    }

    if (/not found|not supported|model/i.test(raw) && /gemini/i.test(raw)) {
      return res.status(502).json({
        message: `The configured Gemini model (${MODEL_NAME}) is unavailable. Set GEMINI_MODEL=gemini-3.1-flash-lite in backend/.env.`,
        code: "GEMINI_MODEL_ERROR",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        message: "Gemini is temporarily rate-limited. Please wait a moment and try again.",
        code: "GEMINI_RATE_LIMITED",
      });
    }

    return res.status(502).json({
      message: "The Farm Market assistant could not get a response from Gemini. Check the backend terminal for the exact error.",
      code: "GEMINI_REQUEST_FAILED",
    });
  }
});

module.exports = router;
