import React, { useEffect, useState } from "react";
import "./ShopProfile.css";
import { Link, useNavigate } from "react-router-dom";
import { EditOutlined, AppstoreOutlined, DeleteOutlined } from "@ant-design/icons";
import { message, Popconfirm } from "antd";
import axios from "axios";
import { getMyPostProducts, ListMyProfile } from "../../../api/auth";
import useEcomStore from "../../../store/ecom-store";

const BASE = "http://localhost:8080";

type MappedProduct = {
  postId: number;
  productId?: number;
  name: string;
  category: string;
  description: string;
  quantity: number | string;
  price: number;
  images: string[];
};

const ShopProfile: React.FC = () => {
  const [products, setProducts] = useState<MappedProduct[]>([]);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const token = useEcomStore((state: any) => state.token);

  // โหลดข้อมูลโพสต์ของร้าน
  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        if (!token) return;
        const res = await getMyPostProducts(token);
        const raw = res.data?.data || [];

        const mapped: MappedProduct[] =
          raw.map((item: any) => {
            const images: string[] =
              item?.Product?.ProductImage?.map((img: any) =>
                img?.image_path?.startsWith("http")
                  ? img.image_path
                  : `${BASE}${img?.image_path || ""}`
              ).filter(Boolean) || [];

            return {
              postId: item?.ID,
              productId: item?.Product?.ID,
              name: item?.Product?.name || "—",
              category: item?.Category?.name || "ไม่ระบุ",
              description: item?.Product?.description || "ไม่ระบุ",
              quantity: item?.Product?.quantity ?? "ไม่ระบุ",
              price: item?.Product?.price ?? 0,
              images,
            };
          }) || [];

        setProducts(mapped);
      } catch (err) {
        console.error("โหลดสินค้าที่โพสต์ล้มเหลว", err);
      }
    };

    const fetchShopInfo = async () => {
      try {
        if (!token) return;
        const res = await ListMyProfile(token);
        setShopInfo(res.data?.data);
      } catch (err) {
        console.error("โหลดข้อมูลร้านค้าล้มเหลว", err);
      }
    };

    fetchMyProducts();
    fetchShopInfo();
  }, [token]);

  // ลบโพสต์ (soft) + ลบ product + ลบรูป (ฝั่ง backend)
  const handleDeletePost = async (postId: number) => {
    try {
      await axios.delete(`${BASE}/api/DeletePost/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      message.success("ลบโพสต์สำเร็จ");
      setProducts((prev) => prev.filter((p) => p.postId !== postId));
    } catch (err) {
      console.error("ลบโพสต์ไม่สำเร็จ", err);
      message.error("ลบโพสต์ไม่สำเร็จ");
    }
  };

  if (!shopInfo) return <p>กำลังโหลดข้อมูลร้านค้า...</p>;

  const { shop_name, slogan, shop_description, logo_path, Category, ShopAddress } = shopInfo;
  const categories = Category ? [Category.category_name] : [];
  const logoUrl = logo_path?.startsWith("http") ? logo_path : `${BASE}${logo_path || ""}`;

  return (
    <div className="shop-container">
      <div className="shop-header">
        <div className="shop-logo-box">
          <img
            src={logoUrl || "https://via.placeholder.com/120?text=No+Logo"}
            alt="Shop Logo"
            className="shop-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/120?text=No+Logo";
            }}
          />
        </div>
        <div className="shop-header-info">
          <h2 className="shop-name">{shop_name}</h2>
          <p className="shop-slogan">{slogan}</p>
        </div>
        <div className="icon-btn">
          <Link to="/user/profile/edit" aria-label="แก้ไขโปรไฟล์">
            <EditOutlined />
          </Link>
          {/* ปุ่มลบโปรไฟล์ (ถ้าทำ) */}
          <DeleteOutlined />
        </div>
      </div>

      <div className="card5">
        <div className="shop-section">
          <h3>🛍 เกี่ยวกับร้าน</h3>
          <div className="shop-description-box">
            {shop_description || <i>ไม่มีข้อมูลคำอธิบายร้าน</i>}
          </div>
        </div>

        <div className="shop-section">
          <h3>📦 หมวดหมู่สินค้า</h3>
          <div className="shop-categories">
            {categories.map((cat: string, index: number) => (
              <span key={index} className="shop-tag">
                {cat}
              </span>
            ))}
          </div>
          <br />
          {products.length !== 0 && (
            <Link to="/user/create-post" className="btn-action">
              <h3>📤 ลงประกาศขายสินค้า</h3>
            </Link>
          )}
        </div>

        <div className="shop-section">
          <h3>📍 ที่อยู่ของร้าน</h3>
          <div className="shop-address-box">
            <div>
              <strong>ที่อยู่:</strong> {ShopAddress?.address || <i>ไม่มีข้อมูล</i>}
            </div>
            <div>
              <strong>ตำบล / แขวง:</strong> {ShopAddress?.sub_district || <i>ไม่มีข้อมูล</i>}
            </div>
            <div>
              <strong>อำเภอ / เขต:</strong> {ShopAddress?.district || <i>ไม่มีข้อมูล</i>}
            </div>
            <div>
              <strong>จังหวัด:</strong> {ShopAddress?.province || <i>ไม่มีข้อมูล</i>}
            </div>
          </div>
        </div>
      </div>

      <div className="shop-section">
        <h3>
          <AppstoreOutlined style={{ marginRight: 6 }} /> รายการสินค้าที่โพสต์ ({products.length})
        </h3>
        {products.length === 0 ? (
          <>
            <p>ยังไม่มีสินค้าในร้านนี้</p>
            <Link to="/user/create-post" className="btn-action">
              <h3>📤 ลงประกาศสินค้าแรกของคุณเลย!</h3>
            </Link>
          </>
        ) : (
          <div className="product-list grid-wrap">
            {products.map((product) => (
              <ProductCard key={product.postId} product={product} onDelete={handleDeletePost} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── การ์ดสินค้า ──
const ProductCard: React.FC<{ product: MappedProduct; onDelete: (id: number) => void }> = ({
  product,
  onDelete,
}) => {
  const imgs: string[] = Array.isArray(product.images) ? product.images : [];
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const mainImg = imgs[active] || "https://via.placeholder.com/300?text=No+Image";

  return (
    <div className="product-card">
      <div className="product-edit-btn">
        <button
          type="button"
          onClick={() => navigate(`/user/products/${product.postId}/edit`)}
          title="แก้ไขโพสต์นี้"
          className="icon-btn"
        >
          <EditOutlined />
        </button>

        <Popconfirm
          title="ยืนยันการลบโพสต์?"
          description="ระบบจะลบโพสต์ สินค้า และรูปภาพของสินค้านี้ (ลบแบบซ่อน)"
          okText="ลบ"
          cancelText="ยกเลิก"
          onConfirm={() => onDelete(product.postId)}
        >
          <button type="button" title="ลบโพสต์นี้" className="icon-btn danger">
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>

      {/* รูปหลัก */}
      <img
        className="main-image"
        src={mainImg}
        alt={product.name}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://via.placeholder.com/300?text=No+Image";
        }}
      />

      {/* แถบรูปย่อย */}
      {imgs.length > 1 && (
        <div className="image-thumbnails" role="listbox" aria-label="รูปสินค้าเพิ่มเติม">
          {imgs.map((src, i) => (
            <button
              key={i}
              type="button"
              className={`thumb ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
              aria-selected={i === active}
              title={`รูปที่ ${i + 1}`}
            >
              <img src={src} alt={`มุมที่ ${i + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <h4 className="product-title">{product.name}</h4>

      <p style={{ marginTop: "4px", fontSize: "0.9rem", color: "#555" }}>
        คำอธิบาย: {product.description}
      </p>
      <p style={{ marginTop: "4px", fontSize: "0.9rem", color: "#555" }}>
        คงเหลือ: {product.quantity}
      </p>
      <p className="product-cat">{product.category}</p>
      <p className="product-price">{product.price} บาท</p>
    </div>
  );
};

export default ShopProfile;
