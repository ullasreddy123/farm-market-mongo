import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import api from "../../api/axios";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  "/api",
  ""
);

export default function CropDetails() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { cropId } = useParams();
  const { addToCart } = useCart();

  const [crop, setCrop] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api
      .get(`/crops/${cropId}`)
      .then(({ data }) => setCrop(data))
      .finally(() => setLoading(false));
  }, [cropId]);

  if (loading) return <div className="center-loading">{t("loading")}</div>;
  if (!crop) return <div className="center-loading">Not found</div>;

  const imageUrl = crop.image
    ? crop.image.startsWith("http")
      ? crop.image
      : `${API_ORIGIN}${crop.image}`
    : null;

  const handleAddToCart = () => {
    addToCart(crop, Number(quantity));
    setAdded(true);
    setTimeout(() => navigate("/trader/cart"), 600);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>{crop.name}</h2>
          </div>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            ✕
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="details-card">
          {imageUrl ? (
            <img className="details-image" src={imageUrl} alt={crop.name} />
          ) : (
            <div className="details-image" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>
              🌾
            </div>
          )}
          <div className="details-body">
            <div className="details-row">
              <span className="label">{t("category")}</span>
              <span className="value">{crop.category?.name?.[lang] || crop.category?.name?.en}</span>
            </div>
            <div className="details-row">
              <span className="label">{t("quantity")}</span>
              <span className="value">
                {crop.quantity} {t(crop.unit)}
              </span>
            </div>
            <div className="details-row">
              <span className="label">{t("pricePerUnit")}</span>
              <span className="value">₹{crop.price}</span>
            </div>
            <div className="details-row">
              <span className="label">{t("farmerPhone")}</span>
              <span className="value">📞 {crop.farmer?.phone}</span>
            </div>
            {crop.description && (
              <div className="details-row" style={{ flexDirection: "column", gap: 6 }}>
                <span className="label">{t("description")}</span>
                <span className="value" style={{ fontWeight: 400 }}>
                  {crop.description}
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>{t("quantity")}</label>
              <input
                type="number"
                min="1"
                max={crop.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <button className="btn btn-primary btn-block" onClick={handleAddToCart} disabled={added}>
              {added ? "✓" : `🛒 ${t("addToCart")}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
