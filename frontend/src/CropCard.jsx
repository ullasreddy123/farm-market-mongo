import { useLanguage } from "../context/LanguageContext";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function CropCard({ crop, categoryName, children }) {
  const { t } = useLanguage();

  console.log("CROP OBJECT:", crop);
  console.log("CROP IMAGE:", crop.image);
  console.log("IMAGE TYPE:", typeof crop.image);
  console.log("STARTS WITH HTTP:", crop.image?.startsWith("http"));

  const imageUrl = crop.image
    ? crop.image.startsWith("http")
      ? crop.image
      : `${API_ORIGIN}${crop.image}`
    : null;

  console.log("FINAL IMAGE URL:", imageUrl);

  return (
    <div className="crop-card">
      {imageUrl ? (
        <img
          className="crop-image"
          src={imageUrl}
          alt={crop.name}
          onError={() => console.error("IMAGE FAILED:", imageUrl)}
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
