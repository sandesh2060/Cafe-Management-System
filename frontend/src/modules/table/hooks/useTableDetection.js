// src/modules/table/hooks/useTableDetection.js
import { useEffect, useRef, useCallback } from "react";
import { useMachine } from "@xstate/react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { detectionMachine } from "../detection/detectionMachine";
import {
  setDetecting,
  setSession,
  setSessionError,
} from "@store/slices/tableSessionSlice";
import { setTableInfo } from "@store/slices/cartSlice";
import api from "@api/axios";
import { ENDPOINTS } from "@api/endpoints";

const GPS_TIMEOUT_MS = parseInt(import.meta.env.VITE_GPS_TIMEOUT_MS || "4000");
const GPS_READINGS_COUNT = parseInt(
  import.meta.env.VITE_GPS_READINGS_COUNT || "3",
);
const GPS_CONFIDENCE_MIN = parseInt(
  import.meta.env.VITE_GPS_CONFIDENCE_MIN || "85",
);

export const useTableDetection = () => {
  const [state, send] = useMachine(detectionMachine);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const watchId = useRef(null);
  const readings = useRef([]);
  const gpsTimer = useRef(null);

  // ── Haversine distance (meters) ────────────────────────────────────────────
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Calculate confidence from GPS readings ─────────────────────────────────
  const calculateConfidence = (coords) => {
    if (!coords || coords.length < 2) return 0;
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Max spread in meters
    const maxSpread = Math.max(
      ...coords.map((c) => haversine(c.latitude, c.longitude, avgLat, avgLng)),
    );
    const avgAccuracy =
      coords.reduce((a, c) => a + (c.accuracy || 10), 0) / coords.length;

    // Score drops with spread and poor accuracy
    const spreadScore = Math.max(0, 100 - maxSpread * 20);
    const accuracyScore = Math.max(0, 100 - avgAccuracy * 3);
    return Math.round((spreadScore + accuracyScore) / 2);
  };

  // ── Create session via API ────────────────────────────────────────────────
  const createSession = useCallback(
    async (payload) => {
      try {
        const data = await api.post(
          payload.method === "gps"
            ? ENDPOINTS.TABLE.DETECT_GPS
            : ENDPOINTS.TABLE.DETECT_QR,
          payload,
        );
        dispatch(setSession(data.session));
        dispatch(
          setTableInfo({
            tableId: data.session.tableId,
            sessionId: data.session.sessionId,
          }),
        );
        send({
          type: "SESSION_CREATED",
          table: data.session.table,
          sessionId: data.session.sessionId,
        });
        navigate("/login");
      } catch (err) {
        const msg = err.response?.data?.message || "Table detection failed";
        dispatch(setSessionError(msg));
        send({ type: "SESSION_ERROR", error: msg });
      }
    },
    [dispatch, navigate, send],
  );

  // ── GPS collection ────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    dispatch(setDetecting());
    send({ type: "START" });

    if (!navigator.geolocation) {
      send({ type: "GPS_DENIED" });
      return;
    }

    gpsTimer.current = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId.current);
      send({ type: "GPS_TIMEOUT" });
    }, GPS_TIMEOUT_MS);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        readings.current.push({
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
        });

        // Drop outlier (highest spread)
        if (readings.current.length > GPS_READINGS_COUNT) {
          // Keep most recent N readings
          readings.current = readings.current.slice(-GPS_READINGS_COUNT);
        }

        if (readings.current.length >= GPS_READINGS_COUNT) {
          clearTimeout(gpsTimer.current);
          navigator.geolocation.clearWatch(watchId.current);

          const score = calculateConfidence(readings.current);
          const avgLat =
            readings.current.reduce((a, r) => a + r.latitude, 0) /
            readings.current.length;
          const avgLng =
            readings.current.reduce((a, r) => a + r.longitude, 0) /
            readings.current.length;
          if (score >= GPS_CONFIDENCE_MIN) {
            send({
              type: "GPS_HIGH_CONFIDENCE",
              coords: {
                latitude: avgLat,
                longitude: avgLng,
                accuracy: readings.current[0].accuracy,
              },
            });
            createSession({
              method: "gps",
              latitude: avgLat,
              longitude: avgLng,
              confidenceScore: score,
            });
          } else {
            send({ type: "GPS_LOW_CONFIDENCE" });
          }
        }
      },
      (err) => {
        clearTimeout(gpsTimer.current);
        send(err.code === 1 ? { type: "GPS_DENIED" } : { type: "GPS_TIMEOUT" });
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    );
  }, [dispatch, send, createSession]);

  // ── QR scanned ────────────────────────────────────────────────────────────
  const onQrScanned = useCallback(
    (token) => {
      send({ type: "QR_SCANNED" });
      createSession({ method: "qr", token });
    },
    [send, createSession],
  );

  // ── Manual entry ──────────────────────────────────────────────────────────
  const onManualEntry = useCallback(
    (tableNumber) => {
      send({ type: "MANUAL_ENTRY" });
      createSession({ method: "manual", tableNumber });
    },
    [send, createSession],
  );

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retry = useCallback(() => {
    readings.current = [];
    send({ type: "RETRY" });
  }, [send]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      clearTimeout(gpsTimer.current);
    };
  }, []);

  return {
    state: state.value,
    context: state.context,
    startGPS,
    onQrScanned,
    onManualEntry,
    retry,
    isDetecting:
      state.matches("requestingGPS") || state.matches("collectingReadings"),
    isQR: state.matches("showingQR"),
    isDone: state.matches("done"),
    isError: state.matches("error"),
  };
};
