import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";
import CropCard from "../../components/CropCard";

export default function MyList() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/crops/my-list")
      .then(({ data }) => setCrops(data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (id) => {
    await api.delete(`/crops/${id}`);
    setCrops((prev) => prev.filter((c) => c._id !== id));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>{t("myList")}</h2>
            <p className="subtitle">{t("appName")}</p>
          </div>
          <button className="icon-btn" onClick={() => navigate("/farmer/dashboard")}>
            ✕
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        {loading ? (
          <div className="center-loading">{t("loading")}</div>
        ) : crops.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🌱</div>
            <p>{t("noListings")}</p>
            <button className="btn btn-primary" onClick={() => navigate("/farmer/add-crop")}>
              {t("addCrop")}
            </button>
          </div>
        ) : (
          <div className="crop-grid">
            {crops.map((crop) => (
              <CropCard key={crop._id} crop={crop} categoryName={crop.category?.name?.[lang]}>
                <div className="crop-actions">
                  <button className="btn btn-danger" onClick={() => handleRemove(crop._id)}>
                    {t("remove")}
                  </button>
                </div>
              </CropCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
