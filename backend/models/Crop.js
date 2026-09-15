const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    image: { type: String, default: "" }, // stored path e.g. /uploads/xyz.jpg
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["kg", "quintal", "ton", "gram", "dozen", "piece"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true }, // false when removed by farmer
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
