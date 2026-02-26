// // frontend/src/modules/customer/pages/LoginPage.jsx
// import { useEffect, useRef, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import {
//   loginWithGoogle,
//   loginAsGuest,
//   setCredentials,
//   selectAuthLoading,
//   selectAuthError,
// } from "@store/slices/authSlice";
// import { selectTableNumber } from "@store/slices/tableSessionSlice";
// import { COLORS } from "@colors";
// import { preloadSounds } from "@shared/utils/soundPlayer";
// import { Github, UserRound, Star } from "lucide-react";
// import gsap from "gsap";

// const LoginPage = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [params] = useSearchParams();
//   const loading = useSelector(selectAuthLoading);
//   const error = useSelector(selectAuthError);
//   const tableNumber = useSelector(selectTableNumber);
//   const cardRef = useRef(null);
//   const [guestLoading, setGuestLoading] = useState(false);

//   // Handle GitHub OAuth token redirect — GitHub redirects back to /login?token=...
//   useEffect(() => {
//     const token = params.get("token");
//     if (!token) return;

//     try {
//       const decoded = JSON.parse(atob(token.split(".")[1]));

//       // Save to localStorage so bootstrap can rehydrate on refresh
//       localStorage.setItem("kc_token", token);

//       // Put into Redux using setCredentials (same shape as guest/google login)
//       dispatch(setCredentials({
//         token,
//         user: { _id: decoded.userId ?? decoded.id, role: decoded.role },
//       }));

//       preloadSounds(decoded.role);
//       navigate("/menu", { replace: true });
//     } catch {
//       // Malformed token — ignore and let user log in normally
//     }
//   }, [params, dispatch, navigate]);

//   useEffect(() => {
//     gsap.fromTo(
//       cardRef.current,
//       { y: 50, opacity: 0 },
//       { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
//     );
//   }, []);

//   const handleGithubLogin = () => {
//     window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
//   };

//   const handleGuest = async () => {
//     setGuestLoading(true);
//     const result = await dispatch(loginAsGuest());
//     setGuestLoading(false);

//     if (!result.error) {
//       // Save token so App.jsx bootstrap can rehydrate Redux on page refresh
//       localStorage.setItem("kc_token", result.payload.token);
//       preloadSounds("customer");
//       navigate("/menu", { replace: true });
//     }
//   };

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-b from-brew to-brew-light
//                     flex flex-col items-center justify-center px-5"
//     >
//       {/* Hero */}
//       <div className="text-center mb-8">
//         <div className="text-6xl mb-4">☕</div>
//         <h1 className="text-3xl font-bold text-white font-display">Welcome!</h1>
//         {tableNumber && (
//           <p className="text-brew-cream mt-1 text-sm">
//             Table {tableNumber} is ready for you
//           </p>
//         )}
//       </div>

//       {/* Card */}
//       <div ref={cardRef} className="w-full max-w-sm space-y-4">
//         {error && (
//           <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
//             {error}
//           </div>
//         )}

//         {/* GitHub Login */}
//         <button
//           onClick={handleGithubLogin}
//           disabled={loading}
//           className="w-full flex items-center justify-center gap-3 bg-white
//                      rounded-xl px-5 py-4 font-semibold text-gray-700 shadow-md
//                      hover:shadow-lg active:scale-95 transition-all duration-150
//                      disabled:opacity-60 min-h-[56px]"
//         >
//           <Github size={22} className="text-gray-800" />
//           Continue with GitHub
//         </button>

//         {/* Divider */}
//         <div className="flex items-center gap-3">
//           <div className="flex-1 h-px bg-white/20" />
//           <span className="text-white/60 text-xs">or</span>
//           <div className="flex-1 h-px bg-white/20" />
//         </div>

//         {/* Guest Login */}
//         <button
//           onClick={handleGuest}
//           disabled={loading || guestLoading}
//           className="w-full flex items-center justify-center gap-3 bg-white/10
//                      border border-white/20 rounded-xl px-5 py-4 font-semibold text-white
//                      hover:bg-white/20 active:scale-95 transition-all duration-150
//                      disabled:opacity-60 min-h-[56px]"
//         >
//           <UserRound size={22} />
//           {guestLoading ? "Setting up…" : "Continue as Guest"}
//         </button>

//         {/* Loyalty teaser */}
//         <div className="card mt-2 flex items-start gap-3 bg-saffron-soft border-saffron/20">
//           <Star
//             size={18}
//             color={COLORS.saffron.DEFAULT}
//             fill={COLORS.saffron.DEFAULT}
//             className="flex-shrink-0 mt-0.5"
//           />
//           <div>
//             <p className="text-sm font-semibold text-brew">
//               Sign in to earn loyalty points
//             </p>
//             <p className="text-xs text-brew-soft mt-0.5">
//               Bronze → Silver → Gold · Up to 15% discount
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
// frontend/src/modules/customer/pages/LoginPage.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

const LoginPage = () => {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    );
  }, []);

  const handleEnter = () => {
    navigate("/menu", { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-brew to-brew-light
                    flex flex-col items-center justify-center px-5"
    >
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">☕</div>
        <h1 className="text-3xl font-bold text-white font-display">Welcome!</h1>
        <p className="text-brew-cream mt-1 text-sm">
          Table detection & auth temporarily disabled
        </p>
      </div>

      {/* Card */}
      <div ref={cardRef} className="w-full max-w-sm space-y-4">
        {/* Direct Enter */}
        <button
          onClick={handleEnter}
          className="w-full flex items-center justify-center gap-3 bg-white
                     rounded-xl px-5 py-4 font-semibold text-gray-700 shadow-md
                     hover:shadow-lg active:scale-95 transition-all duration-150
                     min-h-[56px]"
        >
          Enter Cafe →
        </button>

        {/* Dev note */}
        <p className="text-center text-white/40 text-xs">
          {/* AUTH + TABLE DETECTION TEMPORARILY DISABLED */}
          {/* GitHub OAuth, Guest login, GPS detection commented out */}
          {/* Re-enable: restore original LoginPage.jsx + TableDetectionPage */}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
