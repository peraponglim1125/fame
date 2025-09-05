import axios from "axios";

// ถ้า backend ของคุณอยู่ที่ /api/public ให้เปลี่ยน BASE เป็นอันนั้น
const BASE = "http://localhost:8080/api";

export const getShopProfileBySellerId = (sellerId: string | number) => {
  
  return axios.get(`${BASE}/shops/${sellerId}/profile`);
};

export const getPostProductsBySellerId = (sellerId: string | number) => {
  
  return axios.get(`${BASE}/shops/${sellerId}/posts`);
};
