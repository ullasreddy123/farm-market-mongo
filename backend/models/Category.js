const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "food_crops"
    icon: { type: String, default: "🌾" },
    // translations keyed by language code: en, hi, kn, te, ta, ml
    name: {
      en: { type: String, required: true },
      hi: String,
      kn: String,
      te: String,
      ta: String,
      ml: String,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
