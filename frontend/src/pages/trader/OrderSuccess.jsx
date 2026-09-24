import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function OrderSuccess() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="order-success-page">
      <div className="truck-scene">
        <span className="crop-emoji-target">🌾𓃔𓃽𓀚</span>
        <span className="truck-road" />
        <span className="truck-emoji">🚜</span>
      </div>
      <h1>{t("thankYou")}</h1>
      <p>{t("orderOnWay")}</p>
      <button className="btn btn-green" onClick={() => navigate("/trader/dashboard")}>
        {t("backToHome")}
      </button>
    </div>
  );
}
