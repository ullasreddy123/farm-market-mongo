import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import api from "../api/axios";
import { getGuide } from "../i18n/guides";
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

export default function AssistantChat({ page = "" }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "model", text }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingGuide, setSpeakingGuide] = useState(false);
  const [readReplies, setReadReplies] = useState(
    () => localStorage.getItem("fm_voice_replies") === "1"
  );
  const [notice, setNotice] = useState(""); // small status/error line
  const [guideText, setGuideText] = useState(""); // shown when the device has no voice
  const bottomRef = useRef(null);
  const recognizerRef = useRef(null);
  const lastInputWasVoice = useRef(false);

  const canListen = recognitionSupported();
  const canSpeak = synthesisSupported();
  const hasGuide = Boolean(getGuide(page, "en"));

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

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    recognizerRef.current?.abort();
    setListening(false);
    setNotice("");

    const wasVoice = lastInputWasVoice.current;
    lastInputWasVoice.current = false;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const { data } = await api.post("/assistant/chat", {
        message: text,
        history: messages, // previous turns, before this one
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
            {canListen
              ? 'Tap the 🎤 and speak, or type. Try: "I have 50kg of tomatoes to sell at ₹20 per kg"'
              : 'Try: "I have 50kg of tomatoes to sell at ₹20 per kg"'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`assistant-bubble ${m.role}`}>
            {m.text}
            {m.role === "model" && canSpeak && (
              <button className="assistant-replay" onClick={() => say(m.text)} title="Read aloud">
                🔊
              </button>
            )}
          </div>
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
