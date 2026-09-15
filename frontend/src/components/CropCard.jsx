import { useLanguage } from "../context/LanguageContext";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  "/api",
  ""
);

export default function CropCard({ crop, categoryName, children }) {
  const { t } = useLanguage();
  const imageUrl = crop.image ? `${API_ORIGIN}${crop.image}` : null;

  return (
    <div className="crop-card">
      {imageUrl ? (
        <img className="crop-image" src={imageUrl} alt={crop.name} />
      ) : (
        <div className="crop-image placeholder">🌾</div>
      )}
      <div className="crop-body">
        <div className="crop-name">{crop.name}</div>
        {categoryName && <div className="crop-meta">{categoryName}</div>}
        <div className="crop-meta">
          {crop.quantity} {t(crop.unit)} {t("availableCrops") ? "" : ""}
        </div>
        <div className="crop-price">
          ₹{crop.price} / {t(crop.unit)}
        </div>
        {children}
      </div>
    </div>
  );
}
