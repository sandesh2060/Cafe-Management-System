// src/modules/table-session/tableSession.service.js
import { v4 as uuid }         from "uuid";
import mongoose                from "mongoose";
import TableSession            from "./tableSession.model.js";
import { findNearestTable }    from "./algorithms/nearestTable.js";
import { verifyQrToken }       from "./algorithms/qrHmacVerify.js";
import { cache }               from "../../config/redis.js";
import AppError                from "../../shared/utils/AppError.js";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Safely convert any cafeId value (string | ObjectId) to a Mongoose ObjectId.
 * Throws a 400 AppError if the value is missing or malformed so the caller
 * gets a clear error instead of a silent CastError 500.
 */
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
  userId,
  cafeId,
  latitude,
  longitude,
  confidenceScore,
  gpsAccuracy,
}) => {
  // Bug fix #1 — cafeId arriving as a plain string (e.g. from DEFAULT_CAFE_ID
  // env var or an unauthenticated request body) must be cast to ObjectId before
  // it is used in any Mongoose query or document creation, otherwise Mongoose
  // throws a CastError → 500.
  const cafeObjId = toObjectId(cafeId, "cafeId");

  const result = await findNearestTable(cafeObjId, latitude, longitude, gpsAccuracy);
  if (!result) throw new AppError("No table found at your location", 404);

  return createSession({
    userId,
    cafeId: cafeObjId,
    tableId: result.table._id,
    detectionMethod: "gps",
    gpsAccuracy: gpsAccuracy ?? null,
    confidenceScore,
    tableNumber: result.table.tableNumber,
    zone: result.table.zone,
  });
};

export const detectByQr = async ({ userId, token }) => {
  const { table, cafeId } = await verifyQrToken(token);

  // Same cast — verifyQrToken may return cafeId as a string
  const cafeObjId = toObjectId(cafeId, "cafeId");

  return createSession({
    userId,
    cafeId: cafeObjId,
    tableId: table._id,
    detectionMethod: "qr",
    confidenceScore: 100,
    tableNumber: table.tableNumber,
    zone: table.zone,
  });
};

export const getSession = async (sessionId) => {
  const cached = await cache.get(cache.KEYS.tableSession(sessionId));
  if (cached) return cached;

  const session = await TableSession.findOne({
    sessionId,
    status: "active",
  }).lean();
  return session || null;
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
  userId,
  cafeId,          // already a Mongoose ObjectId at this point
  tableId,
  detectionMethod,
  gpsAccuracy,
  confidenceScore,
  tableNumber,
  zone,
}) => {
  // Close any existing active session for this table
  await TableSession.findOneAndUpdate(
    { tableId, status: "active" },
    { status: "closed", closedAt: new Date() },
  );

  const sessionId = uuid();

  const session = await TableSession.create({
    sessionId,
    tableId,
    cafeId,
    detectionMethod,
    gpsAccuracy,
    confidenceScore,
    // Bug fix #2 — guests have no userId (null/undefined). Pushing null into
    // an ObjectId array causes a Mongoose CastError → 500.
    users: userId ? [userId] : [],
    status: "active",
  });

  // Cache for O(1) future lookups
  await cache.set(
    cache.KEYS.tableSession(sessionId),
    {
      sessionId,
      tableId:         tableId.toString(),
      cafeId:          cafeId.toString(),
      tableNumber,
      zone,
      detectionMethod,
      confidenceScore,
      userId:          userId?.toString() ?? null,
      openedAt:        session.openedAt,
    },
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