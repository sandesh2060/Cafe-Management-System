// frontend/src/modules/customer/pages/LoginPage.jsx

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { selectTableNumber } from "@store/slices/tableSessionSlice";
import { useSelector } from "react-redux";
import gsap from "gsap";

const LoginPage = () => {
  const navigate = useNavigate();
  const tableNumber = useSelector(selectTableNumber);
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    );
  }, []);

  const handleContinue = () => {
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
        {tableNumber && (
          <p className="text-brew-cream mt-1 text-sm">
            Table {tableNumber} is ready for you
          </p>
        )}
      </div>

      {/* Card */}
      <div ref={cardRef} className="w-full max-w-sm space-y-4">
        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center
                     bg-white rounded-xl px-5 py-4 font-semibold text-gray-700
                     shadow-md hover:shadow-lg active:scale-95
                     transition-all duration-150 min-h-[56px]"
        >
          Continue to Menu
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
