const express = require("express");
const router = express.Router();
const { genAI, MODEL_NAME } = require("../config/gemini");
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

// POST /api/assistant/chat
// body: { message, history, lang }
// history: [{ role: "user" | "model", text }]  — previous turns, for context
router.post("/chat", attachUserIfPresent, async (req, res) => {
  try {
    const { message, history = [], lang = "en" } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const toolDeclarations = await buildToolDeclarations();
    const languageName = LANG_NAMES[lang] || "English";
    const loggedIn = Boolean(req.user);

    const systemInstruction = `You are a friendly assistant inside "Farm Market", an app connecting farmers and traders in India.
You are talking to a ${loggedIn ? `logged-in farmer named ${req.user.username}` : "visitor who is not logged in yet"}.
Always reply in ${languageName}, in a simple, warm, conversational tone suited to someone who may not be very familiar with apps.
Your job is to help the farmer either:
1. List a new crop for sale (ask for name, category, quantity, unit, price — one or two questions at a time, not all at once). Once you have everything, call the addCrop tool.
2. Register a new account, if they are not logged in and want to start selling. Collect their name and phone number, then call startRegistration. Never ask for or accept a password — registration passwords are always set on the secure registration page, never in this chat.
If the farmer asks something unrelated to these two tasks, answer briefly and helpfully, then gently steer back to how you can help with selling crops.
${!loggedIn ? "This person is not logged in, so you cannot list crops for them yet — help them register first." : ""}`;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const chatHistory = history.map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({ history: chatHistory });
    let result = await chat.sendMessage(message);

    // Gemini may chain a few tool calls before giving a final text reply.
    let toolResultForUi = null;
    for (let i = 0; i < 5; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const responses = [];
      for (const call of calls) {
        const output = await executeTool(call.name, call.args, { user: req.user });
        if (call.name === "addCrop" && output.success) toolResultForUi = { type: "cropAdded", ...output };
        if (call.name === "startRegistration" && output.success)
          toolResultForUi = { type: "registration", ...output };
        responses.push({ functionResponse: { name: call.name, response: output } });
      }
      result = await chat.sendMessage(responses);
    }

    res.json({
      reply: result.response.text(),
      toolResult: toolResultForUi,
    });
  } catch (err) {
    console.error("Assistant chat failed:", err.message);
    res.status(500).json({ message: err.message || "Assistant is unavailable right now" });
  }
});

module.exports = router;
