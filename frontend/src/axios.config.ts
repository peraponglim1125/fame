import axios from "axios";
import useEcomStore from "./store/ecom-store";

axios.defaults.baseURL = "http://localhost:8080";

// (ออปชัน) แนบ token อัตโนมัติในทุก request
axios.interceptors.request.use((config) => {
  const token = useEcomStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// ดัก 401 -> ล้าง state / redirect ถ้าต้องการ
axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      useEcomStore.getState().clearPersistedStore();
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
