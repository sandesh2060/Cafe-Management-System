// backend/src/modules/loyalty/loyalty.model.js
import mongoose from "mongoose";

const loyaltySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },
    points: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["none", "bronze", "silver", "gold"],
      default: "none",
    },
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

loyaltySchema.index({ cafeId: 1, points: -1 });
loyaltySchema.index({ userId: 1 });

export default mongoose.model("Loyalty", loyaltySchema);
