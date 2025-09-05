import React, { useEffect, useState } from "react";
import AppRoutes from "./pages/routes/AppRoutes";
import useEcomStore from "./store/ecom-store";

const App: React.FC = () => {
  const refreshUser = useEcomStore((s) => s.refreshUser);
  const token = useEcomStore((s) => s.token);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (token) {
          await refreshUser(); // ดึง user/hasShop ให้สดตอนบูต
        }
      } finally {
        if (mounted) setBooting(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, refreshUser]);

  if (booting) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }

  return <AppRoutes />;
};

export default App;
