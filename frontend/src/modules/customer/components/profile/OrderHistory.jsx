// src/modules/customer/components/profile/OrderHistory.jsx
import { useState, useEffect } from "react";
import api from "@api/axios";
import { COLORS } from "@colors";
import { ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  paid: COLORS.matcha.DEFAULT,
  delivered: COLORS.matcha.DEFAULT,
  cancelled: COLORS.terra.DEFAULT,
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api
      .get("/orders/history")
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-cream-deep rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="card text-center py-6 text-brew-soft text-sm">
        No past orders yet. Order something! 😋
      </div>
    );
  }

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      <h3 className="font-bold text-brew text-sm px-4 pt-4 pb-3">
        Order History
      </h3>
      <div className="divide-y divide-cream-border">
        {orders.map((order) => (
          <div key={order._id}>
            <button
              onClick={() =>
                setExpanded(expanded === order._id ? null : order._id)
              }
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-brew">
                    #{order._id.slice(-6).toUpperCase()}
                  </p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[order.status] || COLORS.brew.light,
                    }}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-brew-soft mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}Rs {order.total}
                </p>
              </div>
              <ChevronRight
                size={16}
                color={COLORS.brew.soft}
                className={`transition-transform ${expanded === order._id ? "rotate-90" : ""}`}
              />
            </button>

            {/* Expanded items */}
            {expanded === order._id && (
              <div className="px-4 pb-3 space-y-1.5 bg-cream-dark/40">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-brew-soft">
                      {item.emoji} {item.name} ×{item.quantity}
                    </span>
                    <span className="text-brew font-medium">
                      Rs {item.price * item.quantity}
                    </span>
                  </div>
                ))}
                {order.pointsEarned > 0 && (
                  <p className="text-xs text-saffron font-semibold pt-1">
                    ⭐ +{order.pointsEarned} points earned
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
