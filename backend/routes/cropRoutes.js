const express = require("express");
const router = express.Router();
const multer = require("multer");
const Crop = require("../models/Crop");
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
