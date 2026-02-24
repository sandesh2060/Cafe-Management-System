// src/app/App.jsx
import { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import store from "@store";
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import { useSocket } from "@shared/hooks/useSocket";
import "@styles/globals.css";

// Inner component so hooks can use Redux store
const AppInner = () => {
  useSocket(); // Initialise socket after token is in store

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#111827",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 500,
          },
          success: { iconTheme: { primary: "#2D9B5A", secondary: "#fff" } },
          error: { iconTheme: { primary: "#DC2626", secondary: "#fff" } },
        }}
      />
    </>
  );
};

const App = () => (
  <Provider store={store}>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppInner />
    </BrowserRouter>
  </Provider>
);

export default App;
