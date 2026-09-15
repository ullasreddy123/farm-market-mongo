import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

export default function FarmerRegister() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const sendOtp = async () => {
    setError("");
    setInfo("");
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      return setError(t("phoneHint"));
    }
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { phone: form.phone, purpose: "register" });
      setOtpSent(true);
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
      await api.post("/auth/verify-otp", { phone: form.phone, otp, purpose: "register" });
      setOtpVerified(true);
      setInfo(t("verifyOtp") + " ✓");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!otpVerified) {
      return setError("Please verify your phone number first");
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { ...form, role: "farmer" });
      login(data);
      navigate("/farmer/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-circle">👨‍🌾</div>
          <h1>{t("iAmFarmer")} {t("register")}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && !error && <div className="alert alert-success">{info}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("username")}</label>
            <input value={form.username} onChange={update("username")} required />
          </div>

          <div className="form-group">
            <label>{t("phone")}</label>
            <div className="otp-row">
              <input
                type="tel"
                placeholder={t("phoneHint")}
                value={form.phone}
                maxLength={10}
                disabled={otpSent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))
                }
                required
              />
              <button
                type="button"
                className="btn btn-green"
                onClick={sendOtp}
                disabled={loading || otpSent}
              >
                {otpSent ? t("resendOtp") : t("sendOtp")}
              </button>
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="form-group">
              <label>{t("enterOtp")}</label>
              <div className="otp-row">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
                <button type="button" className="btn btn-primary" onClick={verifyOtp} disabled={loading}>
                  {t("verifyOtp")}
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>{t("email")}</label>
            <input type="email" value={form.email} onChange={update("email")} />
          </div>

          <div className="form-group">
            <label>{t("password")}</label>
            <input type="password" value={form.password} onChange={update("password")} required />
          </div>

          <button className="btn btn-green btn-block" disabled={loading || !otpVerified}>
            {loading ? t("loading") : t("register")}
          </button>
        </form>

        <div className="form-footer-text">
          {t("alreadyHaveAccount")}{" "}
          <Link className="link" to="/farmer/login">
            {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
