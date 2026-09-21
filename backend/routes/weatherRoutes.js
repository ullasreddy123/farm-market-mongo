const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");

// GET /api/weather?city=Bengaluru
// Proxies Open-Meteo (free, keyless) — geocodes the city name to lat/lon,
// then fetches a short-term forecast. Kept server-side so we can add
// caching/rate-limiting later without touching the frontend.
router.get("/", protect, async (req, res) => {
  try {
    const { city } = req.query;
    if (!city || !city.trim()) {
      return res.status(400).json({ message: "City is required" });
    }

    const geoRes = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: city.trim(), count: 1 },
    });

    const place = geoRes.data?.results?.[0];
    if (!place) {
      return res.status(404).json({ message: `Could not find location "${city}"` });
    }

    const { latitude, longitude, name, admin1, country } = place;

    const weatherRes = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude,
        longitude,
        daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: 5,
      },
    });

    const daily = weatherRes.data.daily;
    const forecast = daily.time.map((date, i) => ({
      date,
      weatherCode: daily.weathercode[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      rainChance: daily.precipitation_probability_max[i],
    }));

    res.json({
      location: [name, admin1, country].filter(Boolean).join(", "),
      forecast,
    });
  } catch (err) {
    console.error("Weather fetch failed:", err.message);
    res.status(500).json({ message: "Failed to fetch weather" });
  }
});

module.exports = router;
