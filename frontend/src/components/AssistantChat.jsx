import { Fragment, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getGuide } from "../i18n/guides";
import { gt, unitLabel, parseNumber, UNITS } from "../i18n/guided";
import {
  createRecognizer,
  recognitionSupported,
  speak,
  stopSpeaking,
  synthesisSupported,
} from "../utils/speech";

const MIC_ERRORS = {
  "not-allowed": "Microphone permission was denied. Allow it in your browser settings.",
  "service-not-allowed": "Microphone permission was denied. Allow it in your browser settings.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs an internet connection.",
};

// The guided "List a crop" flow. The app drives these steps itself (no AI call),
// so a farmer only has to tap buttons, and it still works if Gemini is down.
const STEPS = ["category", "name", "quantity", "unit", "price", "confirm"];
const QTY_CHIPS = [10, 25, 50, 100, 250, 500];

export default function AssistantChat({ page = "" }) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // { role: "user" | "model", text, chips?, guided? }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingGuide, setSpeakingGuide] = useState(false);
  const [readReplies, setReadReplies] = useState(
    () => localStorage.getItem("fm_voice_replies") === "1"
  );
  const [notice, setNotice] = useState(""); // small status/error line
  const [guideText, setGuideText] = useState(""); // shown when the device has no voice
  // Guided flow state: null when not active, else { step, data, editing }
  const [flow, setFlow] = useState(null);
  const bottomRef = useRef(null);
  const recognizerRef = useRef(null);
  const lastInputWasVoice = useRef(false);
  const voiceTurn = useRef(false); // true when the current turn started by voice
  const catsRef = useRef([]); // categories loaded for the guided flow

  const canListen = recognitionSupported();
  const canSpeak = synthesisSupported();
  const hasGuide = Boolean(getGuide(page, "en"));
  const isFarmer = user?.role === "farmer";
  const g = (key, vars) => gt(lang, key, vars);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Language changed or component unmounted: stop any audio / listening.
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognizerRef.current?.abort();
    };
  }, [lang]);

  const toggleReadReplies = () => {
    const next = !readReplies;
    setReadReplies(next);
    localStorage.setItem("fm_voice_replies", next ? "1" : "0");
    if (!next) stopSpeaking();
  };

  const say = async (text) => {
    const ok = await speak(text, lang);
    if (!ok) setNotice("This device has no voice for the selected language, so I can't read aloud.");
    return ok;
  };

  const toggleGuide = async () => {
    if (speakingGuide) {
      stopSpeaking();
      setSpeakingGuide(false);
      return;
    }
    const text = getGuide(page, lang);
    if (!text) return;
    setGuideText("");
    setSpeakingGuide(true);
    const ok = await speak(text, lang, { onEnd: () => setSpeakingGuide(false) });
    if (!ok) {
      setSpeakingGuide(false);
      setGuideText(text); // no voice available: show the guide as text instead
    }
  };

  const toggleMic = () => {
    setNotice("");
    if (listening) {
      recognizerRef.current?.stop();
      return;
    }
    stopSpeaking();
    const recognizer = createRecognizer(lang, {
      onText: (text) => setInput(text), // show what was heard so it can be corrected
      onEnd: () => setListening(false),
      onError: (code) => {
        setListening(false);
        setNotice(MIC_ERRORS[code] || "Couldn't use the microphone. Please try again.");
      },
    });
    if (!recognizer) return;
    recognizerRef.current = recognizer;
    lastInputWasVoice.current = true;
    setListening(true);
    recognizer.start();
  };

  // ---------------------------------------------------------------------
  // Guided flow
  // ---------------------------------------------------------------------

  // Adds an assistant message (optionally with tappable chips under it).
  const botSay = (text, chips = []) => {
    setMessages((prev) => [...prev, { role: "model", text, chips, guided: true }]);
    if (canSpeak && (readReplies || voiceTurn.current)) say(text);
  };

  const menuChips = () => [
    { label: `➕ ${g("listCrop")}`, kind: "action", value: "start", tone: "primary" },
    { label: `📋 ${g("myListings")}`, kind: "action", value: "myList" },
    { label: `📦 ${g("orders")}`, kind: "action", value: "orders" },
    { label: `💬 ${g("askQuestion")}`, kind: "action", value: "ask" },
  ];

  const navChips = (step) => {
    const chips = [];
    if (step !== "category") {
      chips.push({ label: `↩ ${g("back")}`, kind: "action", value: "back", tone: "muted" });
    }
    chips.push({ label: `📝 ${g("useForm")}`, kind: "action", value: "form", tone: "muted" });
    chips.push({ label: `✕ ${g("cancel")}`, kind: "action", value: "cancel", tone: "muted" });
    return chips;
  };

  const confirmChips = () => [
    { label: `✅ ${g("saveNow")}`, kind: "action", value: "save", tone: "primary" },
    { label: `📷 ${g("addPhoto")}`, kind: "action", value: "form" },
    { label: `✏️ ${g("change")}`, kind: "action", value: "change" },
    { label: `✕ ${g("cancel")}`, kind: "action", value: "cancel", tone: "muted" },
  ];

  const askStep = async (step, data, editing = false) => {
    setFlow({ step, data, editing });

    if (step === "category") {
      try {
        const { data: cats } = await api.get("/categories");
        catsRef.current = cats;
        botSay(
          g("pickCategory"),
          [
            ...cats.map((c) => ({
              label: `${c.icon} ${c.name[lang] || c.name.en}`,
              kind: "category",
              value: c._id,
              text: c.name[lang] || c.name.en,
            })),
            ...navChips("category"),
          ]
        );
      } catch {
        botSay(g("saveFailed", { reason: "categories" }), menuChips());
        setFlow(null);
      }
      return;
    }

    if (step === "name") {
      let names = [];
      try {
        const { data: s } = await api.get("/crops/suggestions", {
          params: { category: data.category.id },
        });
        names = s.names || [];
      } catch {
        /* suggestions are optional */
      }
      botSay(g("cropNameQ"), [
        ...names.map((n) => ({ label: n, kind: "name", value: n })),
        ...navChips(step),
      ]);
      return;
    }

    if (step === "quantity") {
      botSay(g("qtyQ"), [
        ...QTY_CHIPS.map((n) => ({ label: String(n), kind: "qty", value: n })),
        ...navChips(step),
      ]);
      return;
    }

    if (step === "unit") {
      botSay(g("unitQ"), [
        ...UNITS.map((u) => ({ label: unitLabel(lang, u), kind: "unit", value: u })),
        ...navChips(step),
      ]);
      return;
    }

    if (step === "price") {
      let text = g("priceQ", { unit: unitLabel(lang, data.unit) });
      let priceChips = [];
      try {
        const { data: hint } = await api.get("/crops/price-hint", {
          params: { name: data.name, unit: data.unit },
        });
        if (hint.count >= 2) {
          text += `\n\n${g("priceHint", {
            name: data.name,
            min: hint.min,
            max: hint.max,
            avg: hint.avg,
            unit: unitLabel(lang, data.unit),
          })}`;
          const values = [...new Set([hint.avg, hint.min, hint.max])];
          priceChips = values.map((n) => ({ label: `₹${n}`, kind: "price", value: n }));
        }
      } catch {
        /* the hint is optional */
      }
      botSay(text, [...priceChips, ...navChips(step)]);
      return;
    }

    if (step === "confirm") {
      const u = unitLabel(lang, data.unit);
      botSay(
        [
          g("confirmQ"),
          `${g("lblCrop")}: ${data.name}`,
          `${g("lblCategory")}: ${data.category.label}`,
          `${g("lblQty")}: ${data.quantity} ${u}`,
          `${g("lblPrice")}: ₹${data.price} / ${u}`,
        ].join("\n"),
        confirmChips()
      );
    }
  };

  // Move on after a step is answered: back to the summary when editing,
  // otherwise on to the next step.
  const proceed = (data, fromStep) => {
    if (flow?.editing) return askStep("confirm", data);
    return askStep(STEPS[STEPS.indexOf(fromStep) + 1], data);
  };

  const showMenu = (text) => {
    setFlow(null);
    botSay(text || g("nextQ"), menuChips());
  };

  const goBack = () => {
    if (!flow) return;
    if (flow.editing) return askStep("confirm", flow.data);
    const i = STEPS.indexOf(flow.step);
    if (i <= 0) return showMenu();
    return askStep(STEPS[i - 1], flow.data);
  };

  // Opens the normal Add Crop form with everything entered so far filled in.
  const openForm = () => {
    const d = flow?.data || {};
    const params = new URLSearchParams();
    if (d.category?.id) params.set("category", d.category.id);
    if (d.name) params.set("name", d.name);
    if (d.quantity) params.set("quantity", d.quantity);
    if (d.unit) params.set("unit", d.unit);
    if (d.price) params.set("price", d.price);
    setFlow(null);
    botSay(g("formOpening"));
    setTimeout(() => navigate(`/farmer/add-crop?${params.toString()}`), 700);
  };

  const saveCrop = async () => {
    const d = flow.data;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("name", d.name);
      fd.append("category", d.category.id);
      fd.append("quantity", d.quantity);
      fd.append("unit", d.unit);
      fd.append("price", d.price);
      fd.append("description", "");
      await api.post("/crops", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFlow(null);
      botSay(g("saved", { name: d.name }), [
        { label: `➕ ${g("listAnother")}`, kind: "action", value: "again", tone: "primary" },
        { label: `📋 ${g("myListings")}`, kind: "action", value: "myList" },
      ]);
    } catch (err) {
      botSay(
        g("saveFailed", { reason: err.response?.data?.message || "please try again" }),
        confirmChips()
      );
    } finally {
      setSending(false);
    }
  };

  // A button was tapped.
  const onChip = async (chip) => {
    if (sending) return;
    voiceTurn.current = false;
    stopSpeaking();
    setMessages((prev) => [...prev, { role: "user", text: chip.label, guided: true }]);
    const data = flow?.data || {};

    switch (chip.kind) {
      case "category":
        return proceed({ ...data, category: { id: chip.value, label: chip.text } }, "category");
      case "name":
        return proceed({ ...data, name: chip.value }, "name");
      case "qty":
        return proceed({ ...data, quantity: chip.value }, "quantity");
      case "unit":
        return proceed({ ...data, unit: chip.value }, "unit");
      case "price":
        return proceed({ ...data, price: chip.value }, "price");
      case "edit":
        return askStep(chip.value, data, true);
      case "action":
        break;
      default:
        return;
    }

    switch (chip.value) {
      case "start":
        if (!isFarmer) return botSay(g("loginFirst"));
        return askStep("category", {});
      case "again":
        return askStep("category", {});
      case "myList":
        return navigate("/farmer/my-list");
      case "orders":
        return navigate("/farmer/orders");
      case "ask":
        setFlow(null);
        return botSay(g("askPrompt"));
      case "back":
        return goBack();
      case "form":
        return openForm();
      case "cancel":
        return showMenu(g("cancelled"));
      case "save":
        return saveCrop();
      case "change":
        return botSay(g("changeWhat"), [
          { label: g("lblCrop"), kind: "edit", value: "name" },
          { label: g("lblCategory"), kind: "edit", value: "category" },
          { label: g("lblQty"), kind: "edit", value: "quantity" },
          { label: g("lblPrice"), kind: "edit", value: "price" },
        ]);
      default:
    }
  };

  // The farmer typed or spoke an answer while a guided step is active.
  const handleGuidedText = async (text) => {
    const { step, data } = flow;

    if (step === "name") {
      return proceed({ ...data, name: text.trim().slice(0, 60) }, "name");
    }

    if (step === "quantity" || step === "price") {
      const n = parseNumber(text);
      if (!n || n <= 0) return botSay(g("notNumber"), navChips(step));
      return proceed({ ...data, [step === "quantity" ? "quantity" : "price"]: n }, step);
    }

    const lower = text.trim().toLowerCase();

    if (step === "unit") {
      const match = UNITS.find(
        (u) => lower.includes(u) || text.includes(unitLabel(lang, u))
      );
      if (match) return proceed({ ...data, unit: match }, "unit");
    }

    if (step === "category") {
      const match = catsRef.current.find((c) => {
        const names = [c.name.en, c.name[lang]].filter(Boolean).map((n) => n.toLowerCase());
        return names.some((n) => n === lower || n.includes(lower) || lower.includes(n));
      });
      if (match) {
        return proceed(
          { ...data, category: { id: match._id, label: match.name[lang] || match.name.en } },
          "category"
        );
      }
    }

    // Couldn't understand: show the same choices again.
    const lastChips = [...messages].reverse().find((m) => m.chips?.length)?.chips || [];
    return botSay(g("tapOption"), lastChips);
  };

  // ---------------------------------------------------------------------
  // Sending a typed/spoken message
  // ---------------------------------------------------------------------

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    recognizerRef.current?.abort();
    setListening(false);
    setNotice("");

    const wasVoice = lastInputWasVoice.current;
    lastInputWasVoice.current = false;
    voiceTurn.current = wasVoice;

    // Only real conversation goes to Gemini, not the guided button messages.
    const history = messages
      .filter((m) => !m.guided)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    // A guided step is waiting for an answer: handle it here, no AI call.
    if (flow) {
      await handleGuidedText(text);
      return;
    }

    setSending(true);
    try {
      const { data } = await api.post("/assistant/chat", {
        message: text,
        history, // previous turns, before this one
        lang,
        page: location.pathname, // e.g. /trader/login, so the bot knows the role and screen
      });
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);

      // Read the reply aloud if the user spoke, or if they turned on read-aloud.
      if (canSpeak && (wasVoice || readReplies)) say(data.reply);

      if (data.toolResult?.type === "registration" && data.toolResult.redirectUrl) {
        setTimeout(() => navigate(data.toolResult.redirectUrl), 1200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: err.response?.data?.message || "Sorry, something went wrong." },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <>
        {guideText && (
          <div className="assistant-guide-note">
            <button onClick={() => setGuideText("")} title="Close">
              ✕
            </button>
            <p>{guideText}</p>
            <small>No voice for this language on this device, so here is the guide as text.</small>
          </div>
        )}
        <div className="assistant-fab-group">
          {canSpeak && hasGuide && (
            <button
              className={`assistant-fab guide ${speakingGuide ? "active" : ""}`}
              onClick={toggleGuide}
              title={speakingGuide ? "Stop" : "Listen to a guide for this page"}
            >
              {speakingGuide ? "⏹" : "🔊"}
            </button>
          )}
          <button className="assistant-fab" onClick={() => setOpen(true)} title="Chat with assistant">
            🤖
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="assistant-panel">
      <div className="assistant-header">
        <span>🤖 Farm Market Assistant</span>
        <div className="assistant-header-actions">
          {canSpeak && (
            <button
              className={`assistant-toggle ${readReplies ? "on" : ""}`}
              onClick={toggleReadReplies}
              title={readReplies ? "Reading replies aloud: on" : "Reading replies aloud: off"}
            >
              {readReplies ? "🔊" : "🔈"}
            </button>
          )}
          <button
            className="weather-close-btn"
            onClick={() => {
              stopSpeaking();
              recognizerRef.current?.abort();
              setListening(false);
              setOpen(false);
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 && (
          <div className="assistant-empty">
            {isFarmer ? (
              <>
                <p>{g("menuTitle")}</p>
                <div className="assistant-chips center">
                  {menuChips().map((c, j) => (
                    <button
                      key={j}
                      type="button"
                      className={`assistant-chip ${c.tone || ""}`}
                      onClick={() => onChip(c)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            ) : canListen ? (
              'Tap the 🎤 and speak, or type your question.'
            ) : (
              "Type your question below."
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <Fragment key={i}>
            <div className={`assistant-bubble ${m.role}`}>
              {m.text}
              {m.role === "model" && canSpeak && (
                <button className="assistant-replay" onClick={() => say(m.text)} title="Read aloud">
                  🔊
                </button>
              )}
            </div>
            {i === messages.length - 1 && !sending && m.chips?.length > 0 && (
              <div className="assistant-chips">
                {m.chips.map((c, j) => (
                  <button
                    key={j}
                    type="button"
                    className={`assistant-chip ${c.tone || ""}`}
                    onClick={() => onChip(c)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </Fragment>
        ))}
        {sending && <div className="assistant-bubble model">...</div>}
        <div ref={bottomRef} />
      </div>

      {notice && <div className="assistant-notice">{notice}</div>}

      <form className="assistant-input-row" onSubmit={send}>
        {canListen && (
          <button
            type="button"
            className={`assistant-mic ${listening ? "listening" : ""}`}
            onClick={toggleMic}
            disabled={sending}
            title={listening ? "Stop listening" : "Speak"}
          >
            🎤
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            lastInputWasVoice.current = false; // edited by hand
          }}
          placeholder={listening ? "Listening..." : "Type a message..."}
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
