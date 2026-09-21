import { useState } from "react";
import api from "../api/axios";

// Minimal mapping of Open-Meteo weather codes to an emoji + label.
const WEATHER_CODES = {
  0: { icon: "☀️", label: "Clear sky" },
  1: { icon: "🌤️", label: "Mostly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌧️", label: "Dense drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  80: { icon: "🌦️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Rain showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm + hail" },
  99: { icon: "⛈️", label: "Thunderstorm + hail" },
};

function codeToWeather(code) {
  return WEATHER_CODES[code] || { icon: "🌡️", label: "—" };
}

function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeatherWidget() {
  const [city, setCity] = useState(() => localStorage.getItem("fm_weather_city") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWeather = async (e) => {
    e?.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/weather", { params: { city } });
      setData(data);
      localStorage.setItem("fm_weather_city", city);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load weather");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="weather-widget">
      <form className="weather-search" onSubmit={fetchWeather}>
        <input
          type="text"
          placeholder="Enter your location to fetch weather report (e.g. Bengaluru)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" className="btn btn-outline" disabled={loading}>
          {loading ? "..." : "Check"}
        </button>
      </form>

      {error && <p className="weather-error">{error}</p>}

      {data && (
        <div className="weather-result">
          <p className="weather-location">📍 {data.location}</p>
          <div className="weather-days">
            {data.forecast.map((day, i) => {
              const w = codeToWeather(day.weatherCode);
              return (
                <div key={day.date} className="weather-day">
                  <span className="weather-day-label">{formatDay(day.date, i)}</span>
                  <span className="weather-icon">{w.icon}</span>
                  <span className="weather-temp">
                    {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                  </span>
                  <span className="weather-rain">💧{day.rainChance}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
