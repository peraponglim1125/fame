// src/store/ecom-store.ts
import axios from "axios";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LoginRequest } from "../../interfaces/Login";
import _ from "lodash"

axios.defaults.baseURL = "http://localhost:8080";

type User = {
  id: number;
  username: string;
  people?: any;
  sellerID?: number | null; // ✅ เก็บ sellerID ใน user
  hasShop?: boolean;
};

type StoreState = {
  user: User | null;
  token: string | null;
  hasShop: boolean | null;
  carts: [];

  actionLogin: (values: LoginRequest) => Promise<{ user: User; token: string; hasShop: boolean }>;
  actionRegister: (values: any) => Promise<{ user: User; token?: string }>;

  refreshUser: () => Promise<User | null>;
  logout: () => void;
  GettotalPrice: () => number;
  clearPersistedStore: () => void;
  actionUpdateQuantity: (PostId: any, newQuantity: any) => void;
  actionAddtoCart: (product: any) => void;
  actionRemoveProduct: (PostId: any) => void;

  authHeader: () => { Authorization?: string };
};

const ecomstore = (set: any, get: any): StoreState => ({
  user: null,
  token: null,
  hasShop: null,
  carts: [],

  actionAddtoCart: (product) => {
    const carts = get().carts
    const updateCart = [...carts, { ...product, count: 1 }]

    //step uniq
    const uniqe = _.unionWith(updateCart, _.isEqual)

    set({ carts: uniqe })

  },
  actionUpdateQuantity: (postID, newQuantity) => {
    console.log('update', postID, newQuantity)
    set((state: any) => ({
      carts: state.carts.map((item: any) =>
        item.ID === postID
          ?{...item,count:Math.max(1,newQuantity)}
          :item
        )


    }))
  },
  actionRemoveProduct:(postID:any) =>{
    set((state:any)=>({
      carts: state.carts.filter((item:any)=>
        item.ID !== postID
      )
    }))
  },
  GettotalPrice:()=>{
    return get().carts.reduce(( total:any,item:any)=>{
      return total + item.Product.price * item.count
    },0)
  },

  // ---------- LOGIN ----------
  actionLogin: async (values) => {
    try {
      const res = await axios.post("/api/login", values, {
        headers: { "Content-Type": "application/json" },
      });

      const user: User | null = res.data?.user || null;
      const token: string | null = res.data?.token || null;

      if (!user || !token) {
        set({ user: null, token: null, hasShop: null });
        throw new Error(res.data?.message || "Invalid login response");
      }

      // ถ้ามี hasShop มากับ payload ก็ใช้เลย ไม่ก็ประเมินจากการมี sellerID
      const hasShop =
        typeof user.hasShop === "boolean" ? user.hasShop : user.sellerID != null;

      // ✅ บังคับ normalize sellerID เป็น number | null
      const normalizedUser: User = { ...user, sellerID: user.sellerID ?? null };

      set({ user: normalizedUser, token, hasShop });
      return { user: normalizedUser, token, hasShop };
    } catch (error) {
      set({ user: null, token: null, hasShop: null });
      throw error;
    }
  },

  // ---------- REGISTER ----------
  actionRegister: async (values) => {
    const res = await axios.post("/api/register", values, {
      headers: { "Content-Type": "application/json" },
    });

    const user: User | null = res.data?.user || null;
    const token: string | null = res.data?.token || null;

    if (!user) throw new Error(res.data?.message || "Invalid register response");

    const hasShop =
      typeof user.hasShop === "boolean" ? user.hasShop : user.sellerID != null;

    const normalizedUser: User = { ...user, sellerID: user.sellerID ?? null };

    // บางระบบสมัครสำเร็จแต่ยังไม่ออก token -> เก็บเฉพาะ user ตอนนี้
    set({
      user: token ? normalizedUser : null,
      token: token || null,
      hasShop: token ? hasShop : null,
    });

    return { user: normalizedUser, token: token || undefined };
  },

  // ---------- AUTH HEADER ----------
  authHeader: () => {
    const token = get().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // ---------- REFRESH CURRENT USER ----------
  refreshUser: async () => {
    const token = get().token;
    if (!token) return null;

    try {
      const res = await axios.get("/api/current-user", {
        headers: get().authHeader(),
      });

      const user: User | null = res.data?.user || null;

      // API ส่ง has_shop มาด้วย (จาก controller.CurrentUser)
      const hasShop =
        typeof res.data?.has_shop === "boolean"
          ? res.data.has_shop
          : (user?.hasShop ?? (user?.sellerID != null));

      if (!user) return null;

      const normalizedUser: User = { ...user, sellerID: user.sellerID ?? null };

      set({ user: normalizedUser, hasShop });
      return normalizedUser;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        set({ user: null, token: null, hasShop: null });
      }
      throw err;
    }
  },

  // ---------- LOGOUT ----------
  logout: () => set({ user: null, token: null, hasShop: null }),

  // ---------- CLEAR PERSISTED ----------
  clearPersistedStore: () => {
    // ต้องถูกเรียกหลัง useEcomStore ถูกประกาศ (ดูบล็อคด้านล่าง)
    useEcomStore.persist.clearStorage();
    set({ user: null, token: null, hasShop: null });
  },
});

// สร้าง store + persist ลง localStorage
const useEcomStore = create<StoreState>()(
  persist(ecomstore, {
    name: "ecom-store",
    storage: createJSONStorage(() => localStorage),
  })
);

export default useEcomStore;
