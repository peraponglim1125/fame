import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./axios.config"; // โหลด interceptor

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* พื้นหลังไฟแบบเคลื่อนไหว (ถ้ามี component ก็ import มาใส่ตรงนี้) */}
    <App />
  </React.StrictMode>
);
