import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";

const STATUS_STYLES = {
  pending: { label: "Pending", color: "#a56b00", bg: "#fff3d6" },
  confirmed: { label: "Confirmed", color: "#1a5d1a", bg: "#e3f6e3" },
  delivered: { label: "Delivered", color: "#0b4f8a", bg: "#e0f0fc" },
  cancelled: { label: "Cancelled", color: "#a3242a", bg: "#fbe3e4" },
};

const NEXT_ACTION = {
  pending: { status: "confirmed", label: "Confirm Order" },
  confirmed: { status: "delivered", label: "Mark Delivered" },
};

export default function IncomingOrders() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    api
      .get("/orders/incoming")
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(loadOrders, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
    } catch (err) {
      alert(err.response?.data?.message || "Could not update order");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="top-row">
          <div>
            <h2>Orders</h2>
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
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">📦</div>
            <p>No orders yet</p>
          </div>
        ) : (
          orders.map((order) => {
            const style = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
            const nextAction = NEXT_ACTION[order.status];
            const canCancel = order.status === "pending" || order.status === "confirmed";
            return (
              <div className="weather-widget" key={order._id} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {order.trader?.username || "Trader"} · {order.trader?.phone}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      background: style.bg,
                      color: style.color,
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {style.label}
                  </span>
                </div>

                <div style={{ marginTop: 12 }}>
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        padding: "4px 0",
                      }}
                    >
                      <span>
                        {item.name} — {item.quantity} {item.unit}
                      </span>
                      <span>₹{item.quantity * item.price}</span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--cream-dark)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                  }}
                >
                  <span>Total</span>
                  <span>₹{order.totalAmount}</span>
                </div>

                {(nextAction || canCancel) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {nextAction && (
                      <button
                        className="btn btn-primary"
                        disabled={updatingId === order._id}
                        onClick={() => updateStatus(order._id, nextAction.status)}
                      >
                        {updatingId === order._id ? "..." : nextAction.label}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        className="btn btn-danger"
                        disabled={updatingId === order._id}
                        onClick={() => updateStatus(order._id, "cancelled")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
