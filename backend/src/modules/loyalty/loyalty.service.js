// backend/src/modules/loyalty/loyalty.service.js
import Loyalty from "./loyalty.model.js";
import Order from "../order/order.model.js";
import AppError from "../../shared/utils/AppError.js";

// ── Tier thresholds & discounts (editable via config endpoints) ──────────────
const DEFAULT_CONFIG = {
  bronze: { minPoints: 100, discount: 5 },
  silver: { minPoints: 500, discount: 10 },
  gold: { minPoints: 1000, discount: 15 },
  pointsPerRupee: 1, // 1 point per Rs 1 spent
};

const getTierFromPoints = (points, config = DEFAULT_CONFIG) => {
  if (points >= config.gold.minPoints) return "gold";
  if (points >= config.silver.minPoints) return "silver";
  if (points >= config.bronze.minPoints) return "bronze";
  return "none";
};

// ── Get or create loyalty account ───────────────────────────────────────────
export const getOrCreate = async (userId, cafeId) => {
  let account = await Loyalty.findOne({ userId, cafeId });
  if (!account) account = await Loyalty.create({ userId, cafeId });
  return account;
};

// ── Award points after an order is paid ─────────────────────────────────────
export const awardPoints = async (userId, cafeId, orderTotal) => {
  const points = Math.floor(orderTotal * DEFAULT_CONFIG.pointsPerRupee);
  const account = await getOrCreate(userId, cafeId);

  account.points += points;
  account.totalSpent += orderTotal;
  account.totalOrders += 1;
  account.tier = getTierFromPoints(account.points);
  await account.save();
  return account;
};

// ── Redeem points ────────────────────────────────────────────────────────────
export const redeemPoints = async (userId, cafeId, pointsToRedeem) => {
  const account = await getOrCreate(userId, cafeId);
  if (account.points < pointsToRedeem)
    throw new AppError("Insufficient loyalty points", 400);

  account.points -= pointsToRedeem;
  account.pointsRedeemed += pointsToRedeem;
  account.tier = getTierFromPoints(account.points);
  await account.save();
  return account;
};

// ── Customer: get own loyalty account ───────────────────────────────────────
export const getMyLoyalty = async (userId, cafeId) => {
  const account = await getOrCreate(userId, cafeId);
  return {
    points: account.points,
    tier: account.tier,
    totalSpent: account.totalSpent,
    totalOrders: account.totalOrders,
    pointsRedeemed: account.pointsRedeemed,
    config: DEFAULT_CONFIG,
    nextTier: getNextTierInfo(account.points),
  };
};

const getNextTierInfo = (points) => {
  if (points < DEFAULT_CONFIG.bronze.minPoints)
    return {
      tier: "bronze",
      pointsNeeded: DEFAULT_CONFIG.bronze.minPoints - points,
    };
  if (points < DEFAULT_CONFIG.silver.minPoints)
    return {
      tier: "silver",
      pointsNeeded: DEFAULT_CONFIG.silver.minPoints - points,
    };
  if (points < DEFAULT_CONFIG.gold.minPoints)
    return {
      tier: "gold",
      pointsNeeded: DEFAULT_CONFIG.gold.minPoints - points,
    };
  return { tier: null, pointsNeeded: 0 };
};

// ── Manager: leaderboard ─────────────────────────────────────────────────────
export const getLeaderboard = async (cafeId, limit = 20) => {
  const leaderboard = await Loyalty.find({ cafeId })
    .sort({ points: -1 })
    .limit(limit)
    .populate("userId", "name username avatar")
    .lean();
  return leaderboard;
};

// ── Manager: config (static for now, extensible to DB-backed) ────────────────
export const getConfig = async () => ({ config: DEFAULT_CONFIG });

// ── Loyalty history for a customer ──────────────────────────────────────────
export const getLoyaltyHistory = async (userId, cafeId) => {
  const orders = await Order.find({
    customerId: userId,
    cafeId,
    status: "paid",
    pointsEarned: { $gt: 0 },
  })
    .select("total pointsEarned pointsUsed createdAt")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return orders;
};
