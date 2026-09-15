import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";
import CropCard from "../../components/CropCard";

export default function CropListPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/crops/category/${categoryId}`)
      .then(({ data }) => setCrops(data))
      .finally(() => setLoading(false));
  }, [categoryId]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>{t("availableCrops")}</h2>
          </div>
          <button className="icon-btn" onClick={() => navigate("/trader/dashboard")}>
            ✕
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        {loading ? (
          <div className="center-loading">{t("loading")}</div>
        ) : crops.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🌾</div>
            <p>{t("noListings")}</p>
          </div>
        ) : (
          <div className="crop-grid">
            {crops.map((crop) => (
              <CropCard key={crop._id} crop={crop} categoryName={crop.category?.name?.[lang]}>
                <div className="crop-actions">
                  <button
                    className="btn btn-green"
                    onClick={() => navigate(`/trader/crop/${crop._id}`)}
                  >
                    {t("viewDetails")}
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
