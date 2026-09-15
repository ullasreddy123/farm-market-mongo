import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";

const UNITS = ["kg", "quintal", "ton", "gram", "dozen", "piece"];

export default function AddCrop() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: searchParams.get("category") || "",
    quantity: "",
    unit: "kg",
    price: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/categories").then(({ data }) => {
      setCategories(data);
      setForm((f) => (f.category ? f : { ...f, category: data[0]?._id || "" }));
    });
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);

      await api.post("/crops", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/farmer/my-list");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to list crop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-circle">🌾</div>
          <h1>{t("addCrop")}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("cropName")}</label>
            <input value={form.name} onChange={update("name")} required />
          </div>

          <div className="form-group">
            <label>{t("category")}</label>
            <select value={form.category} onChange={update("category")} required>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {c.name[lang] || c.name.en}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t("cropImage")}</label>
            <input type="file" accept="image/*" onChange={handleImage} />
            {preview && (
              <img
                src={preview}
                alt="preview"
                style={{ marginTop: 10, height: 120, borderRadius: 12, objectFit: "cover" }}
              />
            )}
          </div>

          <div className="form-group">
            <label>{t("quantity")}</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.quantity}
              onChange={update("quantity")}
              required
            />
          </div>

          <div className="form-group">
            <label>{t("unit")}</label>
            <select value={form.unit} onChange={update("unit")}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(u)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t("pricePerUnit")} (₹)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={update("price")} required />
          </div>

          <div className="form-group">
            <label>{t("description")}</label>
            <textarea rows={3} value={form.description} onChange={update("description")} />
          </div>

          <button className="btn btn-green btn-block" disabled={loading}>
            {loading ? t("loading") : t("listProduct")}
          </button>
        </form>

        <div className="form-footer-text">
          <Link className="link" to="/farmer/dashboard">
            ← {t("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
