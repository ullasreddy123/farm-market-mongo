import { useLanguage } from "../context/LanguageContext";

export default function CropCard({ crop, categoryName, children }) {
  const { t } = useLanguage();

  return (
    <div className="crop-card">
      {crop.image ? (
        <img
          className="crop-image"
          src={crop.image}
          alt={crop.name}
          onError={(e) => {
            console.error("Image failed:", crop.image);
          }}
        />
      ) : (
        <div className="crop-image placeholder">🌾</div>
      )}

      <div className="crop-body">
        <div className="crop-name">{crop.name}</div>

        {categoryName && (
          <div className="crop-meta">{categoryName}</div>
        )}

        <div className="crop-meta">
          {crop.quantity} {t(crop.unit)}
        </div>

        <div className="crop-price">
          ₹{crop.price} / {t(crop.unit)}
        </div>

        {children}
      </div>
    </div>
  );
}
