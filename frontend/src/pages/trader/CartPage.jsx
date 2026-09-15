import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  "/api",
  ""
);

export default function CartPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, removeFromCart, totalAmount, totalItems, clearCart } = useCart();

  const handleBuy = () => {
    clearCart();
    navigate("/trader/order-success");
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>{t("cart")}</h2>
          </div>
          <button className="icon-btn" onClick={() => navigate("/trader/dashboard")}>
            ✕
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🛒</div>
            <p>{t("yourCartEmpty")}</p>
            <button className="btn btn-primary" onClick={() => navigate("/trader/dashboard")}>
              {t("categories")}
            </button>
          </div>
        ) : (
          <>
            {items.map(({ crop, quantity }) => {
              const imageUrl = crop.image ? `${API_ORIGIN}${crop.image}` : null;
              return (
                <div className="cart-item" key={crop._id}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={crop.name} />
                  ) : (
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 10,
                        background: "#f2ead4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 26,
                      }}
                    >
                      🌾
                    </div>
                  )}
                  <div className="info">
                    <div className="name">{crop.name}</div>
                    <div className="sub">
                      {quantity} {t(crop.unit)} × ₹{crop.price} = ₹{quantity * crop.price}
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={() => removeFromCart(crop._id)}>
                    {t("remove")}
                  </button>
                </div>
              );
            })}

            <div className="cart-summary">
              <div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {t("totalItems")}: {totalItems}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("totalAmount")}</div>
              </div>
              <div className="amount">₹{totalAmount}</div>
            </div>

            <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={handleBuy}>
              {t("clickToBuy")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
