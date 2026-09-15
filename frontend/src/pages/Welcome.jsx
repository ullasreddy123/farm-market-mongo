import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";

export default function Welcome() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="welcome-hero">
      <div className="welcome-top">
        <LanguageSelector />
      </div>

      <div className="welcome-main">
        <div className="welcome-badge">🌾 {t("appName")}</div>
        <h1 className="welcome-title">{t("welcomeMessage")}</h1>
        <p className="welcome-sub">{t("welcomeSub")}</p>

        <div className="role-cards">
          <button className="role-card" onClick={() => navigate("/farmer/login")}>
            <span className="emoji">👨‍🌾</span>
            <span className="label">{t("iAmFarmer")}</span>
          </button>
          <button className="role-card" onClick={() => navigate("/trader/login")}>
            <span className="emoji">🛒</span>
            <span className="label">{t("iAmTrader")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
