import { Fragment, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getGuide } from "../i18n/guides";
import {
  createRecognizer,
  recognitionSupported,
  speak,
  stopSpeaking,
  synthesisSupported,
} from "../utils/speech";

// ---- Guided flow text (all 6 languages) and helpers: kept in this file so the
// assistant has no extra files to deploy. ----
// Text for the assistant's guided "List a crop" flow, in all six app languages.
// Kept separate from the main translation files so the assistant stays
// self-contained. Use gt(lang, key, vars) to read a string; {{name}} style
// placeholders are filled from vars. Falls back to English if a key is missing.

const UNITS = ["kg", "quintal", "ton", "gram", "dozen", "piece"];

const S = {
  en: {
    menuTitle: "What would you like to do?",
    listCrop: "List a crop",
    myListings: "My listings",
    orders: "Orders",
    askQuestion: "Ask a question",
    askPrompt: "Ask me anything about Farm Market. You can type, or tap the 🎤 and speak.",
    loginFirst: "Please log in as a farmer first, then I can help you list a crop.",
    pickCategory: "Step 1 of 5: What type of crop is it?",
    cropNameQ: "Step 2 of 5: Which crop are you selling?\nTap a name, or type or speak it below.",
    qtyQ: "Step 3 of 5: How much do you have?\nTap a number, or type or speak it.",
    unitQ: "Step 4 of 5: Which unit is that in?",
    priceQ: "Step 5 of 5: What is the price per {{unit}}, in ₹?\nTap a price, or type or speak it.",
    priceHint: "💡 Other listings here: {{name}} is ₹{{min}} to ₹{{max}} per {{unit}} (average ₹{{avg}}).",
    confirmQ: "Please check your listing:",
    lblCrop: "Crop",
    lblCategory: "Type",
    lblQty: "Quantity",
    lblPrice: "Price",
    saveNow: "Save without photo",
    addPhoto: "Add a photo",
    change: "Change something",
    changeWhat: "What do you want to change?",
    useForm: "Use the form instead",
    back: "Back",
    cancel: "Cancel",
    saved: "✅ Done! {{name}} is now listed for traders to see.",
    saveFailed: "I couldn't save it: {{reason}}",
    notNumber: "I couldn't find a number in that. Please tap one, or type digits like 50.",
    tapOption: "Please tap one of the options.",
    cancelled: "Okay, cancelled. Nothing was saved.",
    listAnother: "List another crop",
    nextQ: "What would you like to do next?",
    formOpening: "Opening the form with your details filled in...",
    units: { kg: "kg", quintal: "quintal", ton: "ton", gram: "gram", dozen: "dozen", piece: "piece" },
  },
  hi: {
    menuTitle: "आप क्या करना चाहेंगे?",
    listCrop: "फसल बेचने के लिए डालें",
    myListings: "मेरी सूची",
    orders: "ऑर्डर",
    askQuestion: "सवाल पूछें",
    askPrompt: "Farm Market के बारे में कुछ भी पूछें। टाइप करें या 🎤 दबाकर बोलें।",
    loginFirst: "पहले किसान के रूप में लॉगिन करें, फिर मैं फसल डालने में मदद करूँगा।",
    pickCategory: "चरण 1/5: यह किस प्रकार की फसल है?",
    cropNameQ: "चरण 2/5: आप कौन सी फसल बेच रहे हैं?\nनाम दबाएँ, या नीचे टाइप करें या बोलें।",
    qtyQ: "चरण 3/5: आपके पास कितनी मात्रा है?\nसंख्या दबाएँ, या टाइप करें या बोलें।",
    unitQ: "चरण 4/5: यह किस इकाई में है?",
    priceQ: "चरण 5/5: प्रति {{unit}} कीमत कितनी है (₹ में)?\nकीमत दबाएँ, या टाइप करें या बोलें।",
    priceHint: "💡 यहाँ अन्य सूचियाँ: {{name}} ₹{{min}} से ₹{{max}} प्रति {{unit}} (औसत ₹{{avg}})।",
    confirmQ: "कृपया अपनी सूची जाँचें:",
    lblCrop: "फसल",
    lblCategory: "प्रकार",
    lblQty: "मात्रा",
    lblPrice: "कीमत",
    saveNow: "फोटो के बिना सेव करें",
    addPhoto: "फोटो जोड़ें",
    change: "कुछ बदलें",
    changeWhat: "क्या बदलना है?",
    useForm: "फ़ॉर्म इस्तेमाल करें",
    back: "वापस",
    cancel: "रद्द करें",
    saved: "✅ हो गया! {{name}} अब व्यापारियों को दिखेगी।",
    saveFailed: "मैं सेव नहीं कर पाया: {{reason}}",
    notNumber: "मुझे इसमें कोई संख्या नहीं मिली। कृपया एक दबाएँ या 50 जैसे अंक लिखें।",
    tapOption: "कृपया किसी एक विकल्प को दबाएँ।",
    cancelled: "ठीक है, रद्द कर दिया। कुछ भी सेव नहीं हुआ।",
    listAnother: "एक और फसल डालें",
    nextQ: "आगे क्या करना चाहेंगे?",
    formOpening: "आपकी जानकारी भरकर फ़ॉर्म खोल रहा हूँ...",
    units: { kg: "किलो", quintal: "क्विंटल", ton: "टन", gram: "ग्राम", dozen: "दर्जन", piece: "नग" },
  },
  kn: {
    menuTitle: "ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    listCrop: "ಬೆಳೆ ಮಾರಾಟಕ್ಕೆ ಹಾಕಿ",
    myListings: "ನನ್ನ ಪಟ್ಟಿ",
    orders: "ಆರ್ಡರ್‌ಗಳು",
    askQuestion: "ಪ್ರಶ್ನೆ ಕೇಳಿ",
    askPrompt: "Farm Market ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಿ. ಟೈಪ್ ಮಾಡಿ ಅಥವಾ 🎤 ಒತ್ತಿ ಮಾತನಾಡಿ.",
    loginFirst: "ಮೊದಲು ರೈತರಾಗಿ ಲಾಗಿನ್ ಆಗಿ, ನಂತರ ಬೆಳೆ ಹಾಕಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.",
    pickCategory: "ಹಂತ 1/5: ಇದು ಯಾವ ರೀತಿಯ ಬೆಳೆ?",
    cropNameQ: "ಹಂತ 2/5: ನೀವು ಯಾವ ಬೆಳೆ ಮಾರುತ್ತಿದ್ದೀರಿ?\nಹೆಸರನ್ನು ಒತ್ತಿ, ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ.",
    qtyQ: "ಹಂತ 3/5: ನಿಮ್ಮ ಬಳಿ ಎಷ್ಟು ಇದೆ?\nಸಂಖ್ಯೆಯನ್ನು ಒತ್ತಿ, ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ.",
    unitQ: "ಹಂತ 4/5: ಇದು ಯಾವ ಮಾಪನದಲ್ಲಿ?",
    priceQ: "ಹಂತ 5/5: ಪ್ರತಿ {{unit}}ಗೆ ಬೆಲೆ ಎಷ್ಟು (₹ ನಲ್ಲಿ)?\nಬೆಲೆಯನ್ನು ಒತ್ತಿ, ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ.",
    priceHint: "💡 ಇಲ್ಲಿರುವ ಇತರ ಪಟ್ಟಿಗಳು: {{name}} ಪ್ರತಿ {{unit}}ಗೆ ₹{{min}} ರಿಂದ ₹{{max}} (ಸರಾಸರಿ ₹{{avg}}).",
    confirmQ: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಿ:",
    lblCrop: "ಬೆಳೆ",
    lblCategory: "ವರ್ಗ",
    lblQty: "ಪ್ರಮಾಣ",
    lblPrice: "ಬೆಲೆ",
    saveNow: "ಫೋಟೋ ಇಲ್ಲದೆ ಉಳಿಸಿ",
    addPhoto: "ಫೋಟೋ ಸೇರಿಸಿ",
    change: "ಏನಾದರೂ ಬದಲಿಸಿ",
    changeWhat: "ಏನನ್ನು ಬದಲಿಸಬೇಕು?",
    useForm: "ಫಾರ್ಮ್ ಬಳಸಿ",
    back: "ಹಿಂದೆ",
    cancel: "ರದ್ದುಮಾಡಿ",
    saved: "✅ ಆಯಿತು! {{name}} ಈಗ ವ್ಯಾಪಾರಿಗಳಿಗೆ ಕಾಣಿಸುತ್ತದೆ.",
    saveFailed: "ಉಳಿಸಲು ಆಗಲಿಲ್ಲ: {{reason}}",
    notNumber: "ಇದರಲ್ಲಿ ಸಂಖ್ಯೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಒಂದನ್ನು ಒತ್ತಿ ಅಥವಾ 50 ರಂತೆ ಅಂಕಿಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    tapOption: "ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಒತ್ತಿ.",
    cancelled: "ಸರಿ, ರದ್ದುಮಾಡಲಾಗಿದೆ. ಏನೂ ಉಳಿಸಲಾಗಿಲ್ಲ.",
    listAnother: "ಇನ್ನೊಂದು ಬೆಳೆ ಹಾಕಿ",
    nextQ: "ಮುಂದೆ ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    formOpening: "ನಿಮ್ಮ ವಿವರಗಳೊಂದಿಗೆ ಫಾರ್ಮ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ...",
    units: { kg: "ಕೆ.ಜಿ", quintal: "ಕ್ವಿಂಟಾಲ್", ton: "ಟನ್", gram: "ಗ್ರಾಂ", dozen: "ಡಜನ್", piece: "ತುಂಡು" },
  },
  te: {
    menuTitle: "మీరు ఏమి చేయాలనుకుంటున్నారు?",
    listCrop: "పంటను అమ్మకానికి పెట్టండి",
    myListings: "నా జాబితా",
    orders: "ఆర్డర్లు",
    askQuestion: "ప్రశ్న అడగండి",
    askPrompt: "Farm Market గురించి ఏదైనా అడగండి. టైప్ చేయండి లేదా 🎤 నొక్కి మాట్లాడండి.",
    loginFirst: "ముందు రైతుగా లాగిన్ అవ్వండి, అప్పుడు పంటను జాబితా చేయడంలో నేను సహాయం చేస్తాను.",
    pickCategory: "దశ 1/5: ఇది ఏ రకమైన పంట?",
    cropNameQ: "దశ 2/5: మీరు ఏ పంటను అమ్ముతున్నారు?\nపేరును నొక్కండి, లేదా క్రింద టైప్ చేయండి లేదా మాట్లాడండి.",
    qtyQ: "దశ 3/5: మీ దగ్గర ఎంత ఉంది?\nసంఖ్యను నొక్కండి, లేదా టైప్ చేయండి లేదా మాట్లాడండి.",
    unitQ: "దశ 4/5: ఇది ఏ యూనిట్‌లో?",
    priceQ: "దశ 5/5: ఒక {{unit}}కు ధర ఎంత (₹లో)?\nధరను నొక్కండి, లేదా టైప్ చేయండి లేదా మాట్లాడండి.",
    priceHint: "💡 ఇక్కడ ఇతర జాబితాలు: {{name}} ఒక {{unit}}కు ₹{{min}} నుండి ₹{{max}} (సగటు ₹{{avg}}).",
    confirmQ: "దయచేసి మీ జాబితాను సరిచూడండి:",
    lblCrop: "పంట",
    lblCategory: "రకం",
    lblQty: "పరిమాణం",
    lblPrice: "ధర",
    saveNow: "ఫోటో లేకుండా సేవ్ చేయండి",
    addPhoto: "ఫోటో జోడించండి",
    change: "ఏదైనా మార్చండి",
    changeWhat: "ఏమి మార్చాలి?",
    useForm: "ఫారమ్ వాడండి",
    back: "వెనుకకు",
    cancel: "రద్దు చేయండి",
    saved: "✅ అయిపోయింది! {{name}} ఇప్పుడు వ్యాపారులకు కనిపిస్తుంది.",
    saveFailed: "సేవ్ చేయలేకపోయాను: {{reason}}",
    notNumber: "ఇందులో సంఖ్య కనిపించలేదు. దయచేసి ఒకదాన్ని నొక్కండి లేదా 50 వంటి అంకెలు టైప్ చేయండి.",
    tapOption: "దయచేసి ఒక ఎంపికను నొక్కండి.",
    cancelled: "సరే, రద్దు చేశాను. ఏదీ సేవ్ కాలేదు.",
    listAnother: "మరో పంటను జోడించండి",
    nextQ: "తర్వాత ఏమి చేయాలనుకుంటున్నారు?",
    formOpening: "మీ వివరాలతో ఫారమ్ తెరుస్తున్నాను...",
    units: { kg: "కిలో", quintal: "క్వింటాల్", ton: "టన్ను", gram: "గ్రాము", dozen: "డజను", piece: "ముక్క" },
  },
  ta: {
    menuTitle: "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
    listCrop: "பயிரை விற்பனைக்கு சேர்க்க",
    myListings: "என் பட்டியல்",
    orders: "ஆர்டர்கள்",
    askQuestion: "கேள்வி கேளுங்கள்",
    askPrompt: "Farm Market பற்றி எதையும் கேளுங்கள். தட்டச்சு செய்யுங்கள் அல்லது 🎤 அழுத்திப் பேசுங்கள்.",
    loginFirst: "முதலில் விவசாயியாக உள்நுழையுங்கள், பிறகு பயிரைச் சேர்க்க நான் உதவுகிறேன்.",
    pickCategory: "படி 1/5: இது எந்த வகை பயிர்?",
    cropNameQ: "படி 2/5: நீங்கள் எந்த பயிரை விற்கிறீர்கள்?\nபெயரைத் தட்டவும், அல்லது கீழே தட்டச்சு செய்யவும் அல்லது பேசவும்.",
    qtyQ: "படி 3/5: உங்களிடம் எவ்வளவு உள்ளது?\nஎண்ணைத் தட்டவும், அல்லது தட்டச்சு செய்யவும் அல்லது பேசவும்.",
    unitQ: "படி 4/5: இது எந்த அலகில்?",
    priceQ: "படி 5/5: ஒரு {{unit}}க்கு விலை எவ்வளவு (₹ இல்)?\nவிலையைத் தட்டவும், அல்லது தட்டச்சு செய்யவும் அல்லது பேசவும்.",
    priceHint: "💡 இங்குள்ள பிற பட்டியல்கள்: {{name}} ஒரு {{unit}}க்கு ₹{{min}} முதல் ₹{{max}} வரை (சராசரி ₹{{avg}}).",
    confirmQ: "உங்கள் பட்டியலைச் சரிபாருங்கள்:",
    lblCrop: "பயிர்",
    lblCategory: "வகை",
    lblQty: "அளவு",
    lblPrice: "விலை",
    saveNow: "புகைப்படம் இல்லாமல் சேமி",
    addPhoto: "புகைப்படம் சேர்",
    change: "எதையாவது மாற்று",
    changeWhat: "எதை மாற்ற வேண்டும்?",
    useForm: "படிவத்தைப் பயன்படுத்து",
    back: "பின்",
    cancel: "ரத்து செய்",
    saved: "✅ முடிந்தது! {{name}} இப்போது வியாபாரிகளுக்குத் தெரியும்.",
    saveFailed: "என்னால் சேமிக்க முடியவில்லை: {{reason}}",
    notNumber: "இதில் எண் கிடைக்கவில்லை. ஒன்றைத் தட்டவும் அல்லது 50 போல எண்களை தட்டச்சு செய்யவும்.",
    tapOption: "ஒரு விருப்பத்தைத் தட்டவும்.",
    cancelled: "சரி, ரத்து செய்யப்பட்டது. எதுவும் சேமிக்கப்படவில்லை.",
    listAnother: "மற்றொரு பயிரைச் சேர்",
    nextQ: "அடுத்து என்ன செய்ய விரும்புகிறீர்கள்?",
    formOpening: "உங்கள் விவரங்களுடன் படிவத்தைத் திறக்கிறேன்...",
    units: { kg: "கிலோ", quintal: "குவிண்டால்", ton: "டன்", gram: "கிராம்", dozen: "டஜன்", piece: "துண்டு" },
  },
  ml: {
    menuTitle: "നിങ്ങൾ എന്താണ് ചെയ്യാൻ ആഗ്രഹിക്കുന്നത്?",
    listCrop: "വിള വിൽപ്പനയ്ക്ക് ചേർക്കുക",
    myListings: "എന്റെ ലിസ്റ്റ്",
    orders: "ഓർഡറുകൾ",
    askQuestion: "ചോദ്യം ചോദിക്കുക",
    askPrompt: "Farm Market-നെ കുറിച്ച് എന്തും ചോദിക്കാം. ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ 🎤 അമർത്തി സംസാരിക്കുക.",
    loginFirst: "ആദ്യം കർഷകനായി ലോഗിൻ ചെയ്യുക, എന്നിട്ട് വിള ചേർക്കാൻ ഞാൻ സഹായിക്കാം.",
    pickCategory: "ഘട്ടം 1/5: ഇത് ഏത് തരം വിളയാണ്?",
    cropNameQ: "ഘട്ടം 2/5: നിങ്ങൾ ഏത് വിളയാണ് വിൽക്കുന്നത്?\nപേര് അമർത്തുക, അല്ലെങ്കിൽ താഴെ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക.",
    qtyQ: "ഘട്ടം 3/5: നിങ്ങളുടെ കയ്യിൽ എത്രയുണ്ട്?\nസംഖ്യ അമർത്തുക, അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക.",
    unitQ: "ഘട്ടം 4/5: ഇത് ഏത് യൂണിറ്റിലാണ്?",
    priceQ: "ഘട്ടം 5/5: ഒരു {{unit}}-ന് വില എത്ര (₹-ൽ)?\nവില അമർത്തുക, അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക.",
    priceHint: "💡 ഇവിടുത്തെ മറ്റ് ലിസ്റ്റിംഗുകൾ: {{name}} ഒരു {{unit}}-ന് ₹{{min}} മുതൽ ₹{{max}} വരെ (ശരാശരി ₹{{avg}}).",
    confirmQ: "നിങ്ങളുടെ ലിസ്റ്റിംഗ് പരിശോധിക്കുക:",
    lblCrop: "വിള",
    lblCategory: "വിഭാഗം",
    lblQty: "അളവ്",
    lblPrice: "വില",
    saveNow: "ഫോട്ടോ ഇല്ലാതെ സേവ് ചെയ്യുക",
    addPhoto: "ഫോട്ടോ ചേർക്കുക",
    change: "എന്തെങ്കിലും മാറ്റുക",
    changeWhat: "എന്താണ് മാറ്റേണ്ടത്?",
    useForm: "ഫോം ഉപയോഗിക്കുക",
    back: "പിന്നിലേക്ക്",
    cancel: "റദ്ദാക്കുക",
    saved: "✅ കഴിഞ്ഞു! {{name}} ഇപ്പോൾ വ്യാപാരികൾക്ക് കാണാം.",
    saveFailed: "എനിക്ക് സേവ് ചെയ്യാനായില്ല: {{reason}}",
    notNumber: "ഇതിൽ സംഖ്യ കണ്ടില്ല. ഒന്ന് അമർത്തുക അല്ലെങ്കിൽ 50 പോലെ അക്കങ്ങൾ ടൈപ്പ് ചെയ്യുക.",
    tapOption: "ദയവായി ഒരു ഓപ്ഷൻ അമർത്തുക.",
    cancelled: "ശരി, റദ്ദാക്കി. ഒന്നും സേവ് ചെയ്തിട്ടില്ല.",
    listAnother: "മറ്റൊരു വിള ചേർക്കുക",
    nextQ: "അടുത്തതായി എന്താണ് ചെയ്യേണ്ടത്?",
    formOpening: "നിങ്ങളുടെ വിവരങ്ങളോടെ ഫോം തുറക്കുന്നു...",
    units: { kg: "കിലോ", quintal: "ക്വിന്റൽ", ton: "ടൺ", gram: "ഗ്രാം", dozen: "ഡസൻ", piece: "എണ്ണം" },
  },
};

function gt(lang, key, vars = {}) {
  const raw = S[lang]?.[key] ?? S.en[key] ?? key;
  return String(raw).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
}

function unitLabel(lang, unit) {
  return S[lang]?.units?.[unit] || S.en.units[unit] || unit;
}

// Reads the first number out of typed or spoken text. Handles digits written in
// Devanagari, Kannada, Telugu, Tamil and Malayalam, and commas like 1,500.
const DIGIT_BLOCKS = [0x0966, 0x0ce6, 0x0c66, 0x0be6, 0x0d66]; // zero of each script
function parseNumber(text) {
  let s = "";
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const block = DIGIT_BLOCKS.find((zero) => code >= zero && code <= zero + 9);
    s += block !== undefined ? String(code - block) : ch;
  }
  const m = s.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

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
