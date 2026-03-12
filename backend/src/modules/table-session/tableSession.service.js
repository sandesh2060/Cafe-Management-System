// src/modules/table-session/tableSession.service.js
import { v4 as uuid }         from "uuid";
import mongoose                from "mongoose";
import TableSession            from "./tableSession.model.js";
import { findNearestTable }    from "./algorithms/nearestTable.js";
import { verifyQrToken }       from "./algorithms/qrHmacVerify.js";
import { cache }               from "../../config/redis.js";
import AppError                from "../../shared/utils/AppError.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const toObjectId = (value, label = "cafeId") => {
  if (!value) throw new AppError(`${label} is required`, 400);
  try {
    return new mongoose.Types.ObjectId(value.toString());
  } catch {
    throw new AppError(`Invalid ${label}: ${value}`, 400);
  }
};

// ─── public API ─────────────────────────────────────────────────────────────

export const detectByGps = async ({
  userId, cafeId, latitude, longitude, confidenceScore, gpsAccuracy,
}) => {
  const cafeObjId = toObjectId(cafeId, "cafeId");
  const result    = await findNearestTable(cafeObjId, latitude, longitude, gpsAccuracy);
  if (!result) throw new AppError("No table found at your location", 404);

  return createSession({
    userId,
    cafeId:          cafeObjId,
    tableId:         result.table._id,
    detectionMethod: "gps",
    gpsAccuracy:     gpsAccuracy ?? null,
    confidenceScore,
    tableNumber:     result.table.tableNumber,
    zone:            result.table.zone,
  });
};

export const detectByQr = async ({ userId, token }) => {
  const { table, cafeId } = await verifyQrToken(token);
  const cafeObjId         = toObjectId(cafeId, "cafeId");

  return createSession({
    userId,
    cafeId:          cafeObjId,
    tableId:         table._id,
    detectionMethod: "qr",
    confidenceScore: 100,
    tableNumber:     table.tableNumber,
    zone:            table.zone,
  });
};

export const getSession = async (sessionId) => {
  // 1. Redis cache — has tableNumber (always fresh)
  const cached = await cache.get(cache.KEYS.tableSession(sessionId));
  if (cached) return cached;

  // 2. DB fallback — now includes tableNumber/zone because model stores them
  const session = await TableSession.findOne({
    sessionId,
    status: "active",
  }).lean();

  if (!session) return null;

  // Normalise to the same flat shape the cache uses
  return {
    sessionId:       session.sessionId,
    tableId:         session.tableId.toString(),
    cafeId:          session.cafeId.toString(),
    tableNumber:     session.tableNumber ?? null,
    zone:            session.zone        ?? null,
    detectionMethod: session.detectionMethod,
    confidenceScore: session.confidenceScore,
    status:          session.status,
    openedAt:        session.openedAt,
    userId:          session.users?.[0]?.toString() ?? null,
  };
};

export const closeSession = async (sessionId) => {
  await TableSession.findOneAndUpdate(
    { sessionId },
    { status: "closed", closedAt: new Date() },
  );
  await cache.del(cache.KEYS.tableSession(sessionId));
};

export const heartbeat = async (sessionId) => {
  await TableSession.findOneAndUpdate(
    { sessionId },
    { lastHeartbeat: new Date() },
  );
  const cached = await cache.get(cache.KEYS.tableSession(sessionId));
  if (cached)
    await cache.set(cache.KEYS.tableSession(sessionId), cached, cache.TTL.SESSION);
};

// ─── private ────────────────────────────────────────────────────────────────

const createSession = async ({
  userId, cafeId, tableId, detectionMethod,
  gpsAccuracy, confidenceScore, tableNumber, zone,
}) => {
  // Close any existing active session for this table
  await TableSession.findOneAndUpdate(
    { tableId, status: "active" },
    { status: "closed", closedAt: new Date() },
  );

  const sessionId = uuid();

  // tableNumber + zone now persisted to DB so DB fallback always has them
  await TableSession.create({
    sessionId,
    tableId,
    cafeId,
    tableNumber,    // ← stored in DB
    zone,           // ← stored in DB
    detectionMethod,
    gpsAccuracy,
    confidenceScore,
    users:  userId ? [userId] : [],
    status: "active",
  });

  const sessionData = {
    sessionId,
    tableId:         tableId.toString(),
    cafeId:          cafeId.toString(),
    tableNumber,
    zone,
    detectionMethod,
    confidenceScore,
    userId:          userId?.toString() ?? null,
    openedAt:        new Date(),
  };

  // Cache for O(1) future lookups
  await cache.set(
    cache.KEYS.tableSession(sessionId),
    sessionData,
    cache.TTL.SESSION,
  );

  return {
    session: {
      sessionId,
      tableId:         tableId.toString(),
      cafeId:          cafeId.toString(),
      tableNumber,
      zone,
      detectionMethod,
      confidenceScore,
    },
    table: { tableNumber, zone },
  };
};