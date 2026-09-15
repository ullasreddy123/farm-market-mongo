import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";

export default function FarmerForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: new password
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { phone, purpose: "reset-password" });
      setStep(2);
      setInfo(t("sendOtp") + " ✓");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { phone, otp, purpose: "reset-password" });
      setStep(3);
      setInfo(t("verifyOtp") + " ✓");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phone, newPassword });
      navigate("/farmer/login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-circle">🔑</div>
          <h1>{t("resetPassword")}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && !error && <div className="alert alert-success">{info}</div>}

        {step === 1 && (
          <>
            <div className="form-group">
              <label>{t("phone")}</label>
              <input
                type="tel"
                placeholder={t("phoneHint")}
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="btn btn-green btn-block" onClick={sendOtp} disabled={loading}>
              {loading ? t("loading") : t("sendOtp")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group">
              <label>{t("enterOtp")}</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="btn btn-green btn-block" onClick={verifyOtp} disabled={loading}>
              {loading ? t("loading") : t("verifyOtp")}
            </button>
          </>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <label>{t("newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-green btn-block" disabled={loading}>
              {loading ? t("loading") : t("resetPassword")}
            </button>
          </form>
        )}

        <div className="form-footer-text">
          <Link className="link" to="/farmer/login">
            ← {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
