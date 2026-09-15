require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");

const categories = [
  { key: "food_crops", icon: "🌾", order: 1, name: { en: "Food Crops", hi: "खाद्य फसलें", kn: "ಆಹಾರ ಬೆಳೆಗಳು", te: "ఆహార పంటలు", ta: "உணவு பயிர்கள்", ml: "ഭക്ഷ്യ വിളകൾ" } },
  { key: "industrial_technical_crops", icon: "🏭", order: 2, name: { en: "Industrial & Technical Crops", hi: "औद्योगिक व तकनीकी फसलें", kn: "ಕೈಗಾರಿಕಾ ಮತ್ತು ತಾಂತ್ರಿಕ ಬೆಳೆಗಳು", te: "పారిశ్రామిక & సాంకేతిక పంటలు", ta: "தொழில் & தொழில்நுட்ப பயிர்கள்", ml: "വ്യാവസായിക & സാങ്കേതിക വിളകൾ" } },
  { key: "agronomic_soil_crops", icon: "🌱", order: 3, name: { en: "Agronomic & Soil-Management Crops", hi: "कृषि विज्ञान व मृदा प्रबंधन फसलें", kn: "ಕೃಷಿ ಮತ್ತು ಮಣ್ಣು ನಿರ್ವಹಣಾ ಬೆಳೆಗಳು", te: "వ్యవసాయ & నేల నిర్వహణ పంటలు", ta: "வேளாண் & மண் மேலாண்மை பயிர்கள்", ml: "കാർഷിക & മണ്ണ് പരിപാലന വിളകൾ" } },
  { key: "pulses_legumes", icon: "🌿", order: 4, name: { en: "Pulses / Legumes", hi: "दालें", kn: "ಬೇಳೆಕಾಳುಗಳು", te: "పప్పు ధాన్యాలు", ta: "பருப்பு வகைகள்", ml: "പയർ വർഗ്ഗങ്ങൾ" } },
  { key: "oilseed_crops", icon: "🌻", order: 5, name: { en: "Oilseed Crops", hi: "तिलहन फसलें", kn: "ಎಣ್ಣೆಕಾಳು ಬೆಳೆಗಳು", te: "నూనె గింజల పంటలు", ta: "எண்ணெய் வித்து பயிர்கள்", ml: "എണ്ണക്കുരു വിളകൾ" } },
  { key: "ornamental_landscaping", icon: "🌸", order: 6, name: { en: "Ornamental & Landscaping Crops", hi: "सजावटी व भूदृश्य फसलें", kn: "ಅಲಂಕಾರಿಕ ಮತ್ತು ಭೂದೃಶ್ಯ ಬೆಳೆಗಳು", te: "అలంకార & ప్రకృతి దృశ్య పంటలు", ta: "அலங்கார & நிலப்பரப்பு பயிர்கள்", ml: "അലങ്കാര & ലാൻഡ്സ്കേപ്പിംഗ് വിളകൾ" } },
  { key: "luxury_stimulant_crops", icon: "🌿", order: 7, name: { en: "Luxury / Non-food Stimulant Crops", hi: "उत्तेजक फसलें", kn: "ವಿಲಾಸಿ ಉತ್ತೇಜಕ ಬೆಳೆಗಳು", te: "విలాస ఉత్తేజిత పంటలు", ta: "ஆடம்பர தூண்டுதல் பயிர்கள்", ml: "ആഡംബര ഉത്തേജക വിളകൾ" } },
  { key: "fruits", icon: "🍎", order: 8, name: { en: "Fruits", hi: "फल", kn: "ಹಣ್ಣುಗಳು", te: "పండ్లు", ta: "பழங்கள்", ml: "പഴങ്ങൾ" } },
  { key: "vegetables", icon: "🥕", order: 9, name: { en: "Vegetables", hi: "सब्जियां", kn: "ತರಕಾರಿಗಳು", te: "కూరగాయలు", ta: "காய்கறிகள்", ml: "പച്ചക്കറികൾ" } },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Category.deleteMany({});
  await Category.insertMany(categories);
  console.log("Categories seeded successfully");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
