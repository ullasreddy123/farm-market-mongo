// Thin helpers around the browser's Web Speech API (free, no backend needed).
// Recognition: Chrome / Edge / Android Chrome. Synthesis: depends on the voices
// installed on the device, so always check hasVoice() before promising audio.

export const SPEECH_LANG = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  te: "te-IN",
  ta: "ta-IN",
  ml: "ml-IN",
};

export function recognitionSupported() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export function synthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Chrome loads voices asynchronously, so the first getVoices() call is often empty.
function getVoicesAsync() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1000);
  });
}

async function findVoice(lang) {
  if (!synthesisSupported()) return null;
  const voices = await getVoicesAsync();
  const code = (SPEECH_LANG[lang] || "en-IN").toLowerCase();
  const norm = (v) => v.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((v) => norm(v) === code) ||
    voices.find((v) => norm(v).startsWith(lang)) ||
    null
  );
}

export async function hasVoice(lang) {
  return Boolean(await findVoice(lang));
}

export function stopSpeaking() {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}

// Resolves true if it spoke, false if this device has no voice for the language.
export async function speak(text, lang, { onEnd } = {}) {
  if (!synthesisSupported() || !text) return false;
  const voice = await findVoice(lang);
  if (!voice) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.95;
  utterance.onend = () => onEnd && onEnd();
  utterance.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utterance);
  return true;
}

// Returns a recognizer with .start()/.stop(), or null if unsupported.
export function createRecognizer(lang, { onText, onEnd, onError }) {
  if (!recognitionSupported()) return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SR();
  recognizer.lang = SPEECH_LANG[lang] || "en-IN";
  recognizer.interimResults = true;
  recognizer.continuous = false;
  recognizer.onresult = (event) => {
    const text = Array.from(event.results)
      .map((r) => r[0].transcript)
      .join("");
    onText(text);
  };
  recognizer.onerror = (event) => onError && onError(event.error);
  recognizer.onend = () => onEnd && onEnd();
  return recognizer;
}
