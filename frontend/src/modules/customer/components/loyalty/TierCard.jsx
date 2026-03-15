// src/modules/customer/components/loyalty/TierCard.jsx
import { COLORS } from "@colors";
import { Star } from "lucide-react";

const TIER_CONFIG = {
  none: {
    emoji: "☕",
    label: "New Member",
    discount: "0%",
    gradient: "from-gray-400 to-gray-500",
  },
  bronze: {
    emoji: "🥉",
    label: "Bronze",
    discount: "5%",
    gradient: "from-amber-600 to-amber-800",
  },
  silver: {
    emoji: "🥈",
    label: "Silver",
    discount: "10%",
    gradient: "from-slate-400 to-slate-600",
  },
  gold: {
    emoji: "🥇",
    label: "Gold",
    discount: "15%",
    gradient: "from-yellow-400 to-yellow-600",
  },
};

const TierCard = ({ tier = "none", points = 0 }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.none;

  return (
    <div
      className={`rounded-3xl p-6 text-white bg-gradient-to-br ${cfg.gradient}
                  shadow-lg relative overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/10" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">कौसी चिया</p>
            <h2 className="text-3xl font-bold mt-0.5">
              {cfg.emoji} {cfg.label}
            </h2>
          </div>
          <div className="bg-white/20 rounded-2xl px-3 py-1.5">
            <p className="text-white font-bold text-sm">{cfg.discount} off</p>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-widest">
              Points Balance
            </p>
            <p className="text-4xl font-bold mt-0.5">
              {points.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
            <Star size={14} fill="white" color="white" />
            <span className="text-xs font-bold text-white">1 pt = Rs 10</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierCard;
