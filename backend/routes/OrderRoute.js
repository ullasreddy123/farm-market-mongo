const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Crop = require("../models/Crop");
const { protect, requireRole } = require("../middleware/authMiddleware");

// POST /api/orders  (trader) — body: { items: [{ cropId, quantity }] }
// Cart items may belong to different farmers, so this splits them into one
// Order document per farmer, using each crop's current price/name as a snapshot.
router.post("/", protect, requireRole("trader"), async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    const cropIds = items.map((i) => i.cropId);
    const crops = await Crop.find({ _id: { $in: cropIds }, isActive: true });

    if (crops.length !== items.length) {
      return res.status(400).json({ message: "One or more crops are no longer available" });
    }

    // Group requested items by the crop's farmer
    const groups = new Map(); // farmerId -> orderItems[]
    for (const { cropId, quantity } of items) {
      const crop = crops.find((c) => String(c._id) === String(cropId));
      const qty = Number(quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ message: `Invalid quantity for ${crop.name}` });
      }
      const farmerId = String(crop.farmer);
      if (!groups.has(farmerId)) groups.set(farmerId, []);
      groups.get(farmerId).push({
        crop: crop._id,
        name: crop.name,
        quantity: qty,
        unit: crop.unit,
        price: crop.price,
      });
    }

    const createdOrders = [];
    for (const [farmerId, orderItems] of groups) {
      const totalAmount = orderItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
      const order = await Order.create({
        trader: req.user._id,
        farmer: farmerId,
        items: orderItems,
        totalAmount,
      });
      createdOrders.push(order);
    }

    res.status(201).json(createdOrders);
  } catch (err) {
    console.error("Create order failed:", err.message);
    res.status(500).json({ message: err.message || "Failed to place order" });
  }
});

// GET /api/orders/my  (trader) — orders this trader has placed
router.get("/my", protect, requireRole("trader"), async (req, res) => {
  try {
    const orders = await Order.find({ trader: req.user._id })
      .populate("farmer", "username phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load orders" });
  }
});

// GET /api/orders/incoming  (farmer) — orders placed against this farmer's crops
router.get("/incoming", protect, requireRole("farmer"), async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.user._id })
      .populate("trader", "username phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load orders" });
  }
});

// PATCH /api/orders/:id/status  (farmer) — body: { status }
// Allowed forward path: pending -> confirmed -> delivered.
// Cancellation allowed from pending or confirmed only.
const FORWARD_STEPS = { pending: "confirmed", confirmed: "delivered" };

router.patch("/:id/status", protect, requireRole("farmer"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["confirmed", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.farmer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your order to update" });
    }

    if (status === "cancelled") {
      if (!["pending", "confirmed"].includes(order.status)) {
        return res.status(400).json({ message: `Cannot cancel a ${order.status} order` });
      }
    } else if (FORWARD_STEPS[order.status] !== status) {
      return res
        .status(400)
        .json({ message: `Cannot move order from ${order.status} to ${status}` });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update order" });
  }
});

module.exports = router;
