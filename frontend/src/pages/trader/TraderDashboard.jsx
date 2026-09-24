import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../api/axios";

export default function TraderDashboard() {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
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
            <p className="subtitle">{t("selectCategoryToPurchase")}</p>
          </div>
          <div className="topbar">
            <button className="icon-btn" onClick={() => navigate("/trader/orders")} title="My Orders">
              📦
            </button>
            <button className="icon-btn" onClick={() => navigate("/trader/cart")} title={t("cart")}>
              🛒{totalItems > 0 ? ` ${totalItems}` : ""}
            </button>
            <button className="icon-btn" onClick={handleLogout} title={t("logout")}>
              ⎋
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        <h3 className="section-title">{t("categories")}</h3>
        {loading ? (
          <div className="center-loading">{t("loading")}</div>
        ) : (
          <div className="category-grid">
            {categories.map((cat) => (
              <button
                key={cat._id}
                className="category-card"
                onClick={() => navigate(`/trader/category/${cat._id}`)}
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
