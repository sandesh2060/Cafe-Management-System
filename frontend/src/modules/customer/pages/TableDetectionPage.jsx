// src/modules/customer/pages/TableDetectionPage.jsx
import { useEffect, useRef } from "react";
import { useTableDetection } from "@modules/table/hooks/useTableDetection";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "@store/slices/authSlice";
import QrScannerOverlay from "@modules/table/components/QrScannerOverlay";
import { Wifi, QrCode, Hash, Navigation } from "lucide-react";
import gsap from "gsap";

const TableDetectionPage = () => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const navigate = useNavigate();
  const logoRef = useRef(null);
  const cardRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const ring3Ref = useRef(null);

  const {
    state,
    context,
    startGPS,
    onQrScanned,
    onManualEntry,
    retry,
    isDetecting,
    isQR,
    isDone,
    isError,
  } = useTableDetection();

  // Only redirect if already logged in with a session
  useEffect(() => {
    if (isLoggedIn) navigate("/menu", { replace: true });
  }, [isLoggedIn, navigate]);

  // GSAP animations
  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { y: -36, opacity: 0, scale: 0.88 },
        { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.7)" },
      );
    }
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 0.25, ease: "power4.out" },
      );
    }
    [ring1Ref, ring2Ref, ring3Ref].forEach((ref, i) => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { scale: 1, opacity: 0.6 },
        {
          scale: 2.8,
          opacity: 0,
          duration: 2.5,
          delay: i * 0.75,
          repeat: -1,
          ease: "power2.out",
        },
      );
    });
  }, []);

  useEffect(() => {
    startGPS();
  }, [startGPS]);

  // ── FIX: isScanning must NOT overlap with isQR ──
  // isQR = state.matches('showingQR') — when true, show QR card, not scanning card
  const isScanning =
    state === "idle" ||
    state === "requestingGPS" ||
    state === "collectingReadings";
  // isQR comes from the hook — do NOT include showingQR in isScanning

  return (
    <div className="min-h-screen bg-[#0d0907] flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full bg-amber-600/[0.18] blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[260px] h-[260px] rounded-full bg-orange-800/[0.10] blur-[70px] pointer-events-none" />

      {/* Logo */}
      <div ref={logoRef} className="text-center mb-10 relative z-10">
        <div className="relative w-[78px] h-[78px] mx-auto mb-5">
          <div className="absolute inset-0 rounded-[22px] bg-amber-500/25 blur-2xl scale-150" />
          <div className="relative w-full h-full rounded-[22px] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[38px] shadow-2xl shadow-amber-950/70 ring-1 ring-white/[0.12]">
            ☕
          </div>
        </div>
        <h1 className="text-[32px] font-black text-amber-50 leading-none tracking-tight mb-2">
          कौसी चिया
        </h1>
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-px bg-amber-500/30" />
          <p className="text-[10px] font-semibold tracking-[3.5px] text-amber-400/50 uppercase">
            Smart Cafe · Kathmandu
          </p>
          <div className="w-8 h-px bg-amber-500/30" />
        </div>
      </div>

      {/* Detection card */}
      <div ref={cardRef} className="w-full max-w-[348px] relative z-10">
        {/* ── GPS Scanning ── */}
        {isScanning && (
          <div className="rounded-[30px] bg-white/[0.035] border border-white/[0.07] backdrop-blur-3xl px-7 py-10 text-center shadow-[0_32px_80px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-amber-400/[0.07]">
            <div className="relative w-[88px] h-[88px] mx-auto mb-8 flex items-center justify-center">
              <div
                ref={ring1Ref}
                className="absolute w-[88px] h-[88px] rounded-full border border-amber-500/40"
              />
              <div
                ref={ring2Ref}
                className="absolute w-[88px] h-[88px] rounded-full border border-amber-500/30"
              />
              <div
                ref={ring3Ref}
                className="absolute w-[88px] h-[88px] rounded-full border border-amber-500/20"
              />
              <div className="relative w-[52px] h-[52px] rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-950/60 z-10 ring-1 ring-white/[0.15]">
                <Navigation
                  size={21}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h2 className="text-[21px] font-bold text-amber-50 tracking-tight mb-2">
              Finding Your Table
            </h2>
            <p className="text-[13px] leading-relaxed text-amber-100/35 mb-8 px-2">
              {state === "collectingReadings"
                ? "Collecting accurate GPS readings…"
                : "Allow location access to detect your table automatically"}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/[0.10] border border-amber-500/[0.18]">
              <Wifi size={12} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400 tracking-wide">
                GPS · No QR needed
              </span>
            </div>

            <div className="mt-8 h-[2px] rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                style={{ animation: "slideShimmer 1.8s ease-in-out infinite" }}
              />
            </div>

            {/* Dev debug pill */}
            {import.meta.env.DEV && (
              <p className="mt-4 text-[10px] text-amber-400/40 font-mono">
                state:{" "}
                {typeof state === "string" ? state : JSON.stringify(state)}
              </p>
            )}
          </div>
        )}

        {/* ── QR Fallback ── shown when GPS times out / denied / low confidence */}
        {isQR && (
          <div className="rounded-[30px] bg-white/[0.035] border border-white/[0.07] backdrop-blur-3xl px-7 py-8 shadow-[0_32px_80px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-amber-400/[0.07]">
            <div className="text-center mb-6">
              <div className="w-[54px] h-[54px] rounded-[16px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <QrCode size={25} className="text-amber-400" />
              </div>
              <h2 className="text-[20px] font-bold text-amber-50 tracking-tight mb-1.5">
                Scan Table QR
              </h2>
              <p className="text-[13px] text-amber-100/35 leading-relaxed">
                GPS unavailable. Scan the QR on your table.
              </p>
            </div>

            <QrScannerOverlay onScan={onQrScanned} />

            <div className="mt-5 pt-5 border-t border-white/[0.05]">
              <p className="text-center text-[10px] font-semibold tracking-[3px] uppercase text-amber-200/25 mb-3.5">
                No QR code?
              </p>
              <ManualTableEntry onSubmit={onManualEntry} />
            </div>

            {import.meta.env.DEV && (
              <p className="mt-4 text-center text-[10px] text-amber-400/40 font-mono">
                state:{" "}
                {typeof state === "string" ? state : JSON.stringify(state)}
              </p>
            )}
          </div>
        )}

        {/* ── Creating Session ── */}
        {state === "creatingSession" && (
          <div className="rounded-[30px] bg-white/[0.035] border border-white/[0.07] backdrop-blur-3xl px-7 py-14 text-center shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
            <div className="relative w-14 h-14 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
              <div className="w-14 h-14 rounded-full border-[3px] border-amber-900/30 border-t-amber-400 animate-spin" />
            </div>
            <p className="text-[16px] font-semibold text-amber-50 mb-1">
              Setting up your session…
            </p>
            <p className="text-[12px] text-amber-200/30">Just a moment</p>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="rounded-[30px] bg-white/[0.035] border border-white/[0.07] backdrop-blur-3xl px-7 py-10 text-center shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
            <div className="text-5xl mb-5">😕</div>
            <h2 className="text-[20px] font-bold text-amber-50 tracking-tight mb-2">
              Detection Failed
            </h2>
            <p className="text-[13px] text-amber-100/35 leading-relaxed mb-8">
              {context.error}
            </p>
            <button
              onClick={retry}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-600 text-white text-[14px] font-semibold tracking-wide shadow-xl shadow-amber-950/50 active:scale-[0.97] transition-transform duration-150"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-9 text-[10px] font-medium tracking-[3px] uppercase text-amber-200/[0.18] relative z-10">
        Powered by ConvoS
      </p>

      <style>{`
        @keyframes slideShimmer {
          0%   { transform: translateX(-100%) }
          100% { transform: translateX(340%) }
        }
      `}</style>
    </div>
  );
};

const ManualTableEntry = ({ onSubmit }) => {
  const ref = useRef("");
  return (
    <div className="flex gap-2.5">
      <div className="flex-1 relative">
        <Hash
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/40"
        />
        <input
          type="text"
          placeholder="Table number"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-3 py-3 text-[13px] text-amber-50 placeholder-amber-100/20 outline-none focus:border-amber-500/35 focus:bg-white/[0.07] transition-all duration-200"
          onChange={(e) => {
            ref.current = e.target.value;
          }}
        />
      </div>
      <button
        className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white text-[13px] font-semibold shadow-lg shadow-amber-950/40 active:scale-95 transition-transform duration-150"
        onClick={() => ref.current && onSubmit(ref.current.trim())}
      >
        Go
      </button>
    </div>
  );
};

export default TableDetectionPage;
