import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import WeatherWidget from "../../components/WeatherWidget";

export default function FarmerDashboard() {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>{t("welcomeUser", { name: user?.username })} 👋</h2>
            <p className="subtitle">{t("appName")}</p>
          </div>
          <button className="icon-btn" onClick={handleLogout} title={t("logout")}>
            ⎋
          </button>
        </div>
        <div className="action-row">
          <button className="btn btn-primary" onClick={() => navigate("/farmer/add-crop")}>
            ➕ {t("sellCrop")}
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/farmer/my-list")}>
            📋 {t("myList")}
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/farmer/orders")}>
            📦 Orders
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        <WeatherWidget />
        <h3 className="section-title">{t("categories")}</h3>
        {loading ? (
          <div className="center-loading">{t("loading")}</div>
        ) : (
          <div className="category-grid">
            {categories.map((cat) => (
              <button
                key={cat._id}
                className="category-card"
                onClick={() => navigate(`/farmer/add-crop?category=${cat._id}`)}
              >
                <span className="icon">{cat.icon}</span>
                <span className="name">{cat.name[lang] || cat.name.en}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
