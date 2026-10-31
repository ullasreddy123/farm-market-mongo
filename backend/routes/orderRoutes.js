const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Crop = require("../models/Crop");
const { protect, requireRole } = require("../middleware/authMiddleware");

// POST /api/orders  (trader) — body: { items: [{ cropId, quantity }] }
// Cart items may belong to different farmers, so this splits them into one
// Order document per farmer, using each crop's current price/name as a snapshot.
//
// STOCK RESERVATION: the ordered quantity is subtracted from Crop.quantity
// immediately (atomically), so other traders instantly see the reduced stock
// and two traders can never buy the same kilos. If the farmer later cancels,
// the quantity is added back (see the status route below).
router.post("/", protect, requireRole("trader"), async (req, res) => {
  const reserved = []; // [{ cropId, qty }] — used to roll back on any failure

  const rollback = async () => {
    for (const r of reserved) {
      await Crop.updateOne({ _id: r.cropId }, { $inc: { quantity: r.qty } });
    }
  };

  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    // Merge duplicate cart lines for the same crop and validate quantities
    const wanted = new Map(); // cropId -> qty
    for (const { cropId, quantity } of items) {
      const qty = Number(quantity);
      if (!cropId || !qty || qty <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      wanted.set(String(cropId), (wanted.get(String(cropId)) || 0) + qty);
    }

    // Reserve stock one crop at a time. The filter { quantity: { $gte: qty } }
    // plus $inc happens as ONE atomic operation in MongoDB, so it only succeeds
    // if enough stock is still there at that exact moment.
    const crops = []; // post-reservation crop documents
    for (const [cropId, qty] of wanted) {
      const crop = await Crop.findOneAndUpdate(
        { _id: cropId, isActive: true, quantity: { $gte: qty } },
        { $inc: { quantity: -qty } },
        { new: true }
      );

      if (!crop) {
        await rollback();
        const current = await Crop.findOne({ _id: cropId, isActive: true });
        return res.status(409).json({
          message: current
            ? `Only ${current.quantity} ${current.unit} of ${current.name} left. Please reduce the quantity.`
            : "One or more crops are no longer available",
        });
      }
      reserved.push({ cropId: crop._id, qty });
      crops.push({ crop, qty });
    }

    // Group reserved items by the crop's farmer
    const groups = new Map(); // farmerId -> orderItems[]
    for (const { crop, qty } of crops) {
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
    // Anything failed after reserving stock: give the stock back
    try {
      await rollback();
    } catch (rollbackErr) {
      console.error("Stock rollback failed:", rollbackErr.message);
    }
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

      // Atomic status change: only ONE request can flip this order to
      // "cancelled", so the stock below is restored exactly once even if the
      // farmer double-taps the button.
      const cancelled = await Order.findOneAndUpdate(
        { _id: order._id, status: { $in: ["pending", "confirmed"] } },
        { status: "cancelled" },
        { new: true }
      );
      if (!cancelled) {
        return res.status(409).json({ message: "Order was already updated" });
      }

      // Give the reserved stock back to each crop (no-op if the crop was deleted)
      for (const item of cancelled.items) {
        await Crop.updateOne({ _id: item.crop }, { $inc: { quantity: item.quantity } });
      }
      return res.json(cancelled);
    }

    if (FORWARD_STEPS[order.status] !== status) {
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
