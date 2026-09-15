import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

export default function TraderLogin() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone, password, role: "trader" });
      login(data);
      navigate("/trader/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-circle">🛒</div>
          <h1>{t("iAmTrader")} {t("login")}</h1>
          <p>{t("welcomeMessage")}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("phone")}</label>
            <input
              type="tel"
              placeholder={t("phoneHint")}
              value={phone}
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="form-group">
            <label>{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Link className="forgot-link" to="/trader/forgot-password">
            {t("forgotPassword")}
          </Link>

          <button className="btn btn-green btn-block" disabled={loading}>
            {loading ? t("loading") : t("login")}
          </button>
        </form>

        <div className="form-footer-text">
          {t("dontHaveAccount")}{" "}
          <Link className="link" to="/trader/register">
            {t("register")}
          </Link>
        </div>
        <div className="form-footer-text">
          <Link className="link" to="/">
            ← {t("backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
