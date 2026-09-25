const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
    name: { type: String, required: true }, // snapshot — survives crop being edited/removed later
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    price: { type: Number, required: true }, // snapshot price per unit at order time
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    trader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
