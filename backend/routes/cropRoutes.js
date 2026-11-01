const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const Crop = require("../models/Crop");
const Category = require("../models/Category");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { uploadBufferToCloudinary } = require("../config/cloudinary");

// Multer setup for crop image uploads — keeps the file in memory (as a buffer)
// instead of writing to local disk, since Vercel's serverless filesystem is
// read-only/ephemeral. The buffer is then uploaded to Cloudinary manually below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// @route POST /api/crops  (farmer only) - list a new crop
router.post(
  "/",
  protect,
  requireRole("farmer"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, category, quantity, unit, price, description } = req.body;
      if (!name || !category || !quantity || !unit || !price) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!(Number(quantity) > 0) || !(Number(price) > 0)) {
        return res.status(400).json({ message: "Quantity and price must be greater than 0" });
      }

      let imageUrl = "";
      if (req.file) {
        const result = await uploadBufferToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      }

      const crop = await Crop.create({
        farmer: req.user._id,
        name,
        category,
        quantity,
        unit,
        price,
        description,
        image: imageUrl,
      });

      res.status(201).json(crop);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: err.message || "Failed to list crop" });
    }
  }
);

// @route GET /api/crops/my-list  (farmer only) - farmer's own listings
router.get("/my-list", protect, requireRole("farmer"), async (req, res) => {
  try {
    const crops = await Crop.find({ farmer: req.user._id }).populate("category").sort({
      createdAt: -1,
    });
    res.json(crops);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your listings" });
  }
});

// @route DELETE /api/crops/:id  (farmer only) - remove own listing
router.delete("/:id", protect, requireRole("farmer"), async (req, res) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, farmer: req.user._id });
    if (!crop) {
      return res.status(404).json({ message: "Listing not found" });
    }
    await crop.deleteOne();
    res.json({ message: "Listing removed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove listing" });
  }
});


// Starter crop names per category, shown as tappable suggestions in the
// assistant's guided "List a crop" flow so a farmer doesn't have to type.
const DEFAULT_CROP_NAMES = {
  food_crops: ["Rice", "Wheat", "Maize", "Ragi", "Jowar", "Bajra"],
  industrial_technical_crops: ["Sugarcane", "Cotton", "Jute", "Tobacco", "Rubber"],
  agronomic_soil_crops: ["Sunn Hemp", "Dhaincha", "Berseem", "Guar"],
  pulses_legumes: ["Toor Dal", "Moong", "Urad", "Chana", "Masoor"],
  oilseed_crops: ["Groundnut", "Sunflower", "Soybean", "Mustard", "Sesame"],
  ornamental_landscaping: ["Rose", "Marigold", "Jasmine", "Chrysanthemum"],
  luxury_stimulant_crops: ["Coffee", "Tea", "Areca Nut", "Tobacco"],
  fruits: ["Mango", "Banana", "Apple", "Grapes", "Pomegranate", "Orange"],
  vegetables: ["Tomato", "Onion", "Potato", "Brinjal", "Carrot", "Cabbage"],
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @route GET /api/crops/suggestions?category=<categoryId>  (farmer only)
// Names to offer as tappable choices: the farmer's own recent crops first,
// then the most common names on the platform, then built-in defaults.
router.get("/suggestions", protect, requireRole("farmer"), async (req, res) => {
  try {
    const { category } = req.query;
    if (!mongoose.Types.ObjectId.isValid(category)) return res.json({ names: [] });
    const catId = new mongoose.Types.ObjectId(category);

    const [mine, popular, cat] = await Promise.all([
      Crop.aggregate([
        { $match: { farmer: req.user._id, category: catId } },
        { $group: { _id: { $toLower: "$name" }, name: { $first: "$name" }, last: { $max: "$createdAt" } } },
        { $sort: { last: -1 } },
        { $limit: 3 },
      ]),
      Crop.aggregate([
        { $match: { category: catId, isActive: true } },
        { $group: { _id: { $toLower: "$name" }, name: { $first: "$name" }, n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 3 },
      ]),
      Category.findById(catId).select("key"),
    ]);

    const seen = new Set();
    const names = [];
    const add = (n) => {
      const clean = String(n || "").trim();
      const k = clean.toLowerCase();
      if (clean && !seen.has(k) && names.length < 8) {
        seen.add(k);
        names.push(clean);
      }
    };
    mine.forEach((m) => add(m.name));
    popular.forEach((m) => add(m.name));
    (DEFAULT_CROP_NAMES[cat?.key] || []).forEach(add);

    res.json({ names });
  } catch (err) {
    res.status(500).json({ message: "Failed to load suggestions" });
  }
});

// @route GET /api/crops/price-hint?name=Tomato&unit=kg  (farmer only)
// Anonymous min/max/average price of active listings with the same crop name
// and unit. Only returned when at least 2 listings exist, so a hint never
// points at one specific farmer.
router.get("/price-hint", protect, requireRole("farmer"), async (req, res) => {
  try {
    const name = String(req.query.name || "").trim().slice(0, 60);
    const unit = String(req.query.unit || "");
    if (!name || !unit) return res.json({ count: 0 });

    const stats = await Crop.aggregate([
      {
        $match: {
          name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
          unit,
          isActive: true,
          price: { $gt: 0 },
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, min: { $min: "$price" }, max: { $max: "$price" }, avg: { $avg: "$price" } } },
    ]);

    const s = stats[0];
    if (!s || s.count < 2) return res.json({ count: s?.count || 0 });
    res.json({ count: s.count, min: Math.round(s.min), max: Math.round(s.max), avg: Math.round(s.avg) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load price hint" });
  }
});

// @route GET /api/crops/category/:categoryId  (trader) - browse available crops
router.get("/category/:categoryId", protect, requireRole("trader"), async (req, res) => {
  try {
    const crops = await Crop.find({
      category: req.params.categoryId,
      isActive: true,
      quantity: { $gt: 0 },
    })
      .populate("farmer", "username phone")
      .populate("category")
      .sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch crops" });
  }
});

// @route GET /api/crops/:id  (trader) - crop details incl. farmer phone
router.get("/:id", protect, requireRole("trader"), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id)
      .populate("farmer", "username phone")
      .populate("category");
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    res.json(crop);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch crop details" });
  }
});

module.exports = router;
