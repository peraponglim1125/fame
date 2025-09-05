import React, { useEffect, useState } from 'react';
import './ShopProfile.css'; // ใช้สไตล์เดิมได้เลย
import { useParams } from "react-router-dom";
import { AppstoreOutlined } from '@ant-design/icons';
import { getShopProfileBySellerId, getPostProductsBySellerId } from '../../../api/shop_public';

const BASE = 'http://localhost:8080';

const ShopPublic: React.FC = () => {
  const { sellerId } = useParams();
  const [products, setProducts] = useState<any[]>([]);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    
    const run = async () => {
      try {
        const [resShop, resPosts] = await Promise.all([
          getShopProfileBySellerId(sellerId),
          getPostProductsBySellerId(sellerId),
        ]);

        setShopInfo(resShop.data?.data ?? null);

        const raw = resPosts.data?.data || [];
        const mapped = raw.map((item: any) => {
          const images: string[] =
            item?.Product?.ProductImage?.map((img: any) =>
              img?.image_path?.startsWith('http')
                ? img.image_path
                : `${BASE}${img?.image_path || ''}`
            ).filter(Boolean) || [];

          return {
            postId: item?.ID,
            productId: item?.Product?.ID,
            name: item?.Product?.name || '—',
            category: item?.Category?.name || 'ไม่ระบุ',
            description: item?.Product?.description || 'ไม่ระบุ',
            quantity: item?.Product?.quantity || 'ไม่ระบุ',
            price: item?.Product?.price ?? 0,
            images,
          };
        });

        setProducts(mapped);
      } catch (err) {
        console.error("โหลดหน้าร้านสาธารณะล้มเหลว:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [sellerId]);

  if (loading) return <p>กำลังโหลดข้อมูลร้านค้า...</p>;
  if (!shopInfo) return <p>ไม่พบข้อมูลร้านค้าสำหรับผู้ขาย {sellerId}</p>;

  const {
    shop_name,
    slogan,
    shop_description,
    logo_path,
    Category,
    ShopAddress,
  } = shopInfo;

  const categories = Category ? [Category.category_name] : [];
  const logoUrl = logo_path?.startsWith('http') ? logo_path : `${BASE}${logo_path || ''}`;

  return (
    <div className="shop-container">
      {/* Header */}
      <div className="shop-header">
        <div className="shop-logo-box">
          <img
            src={logoUrl || 'https://via.placeholder.com/120?text=No+Logo'}
            alt="Shop Logo"
            className="shop-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120?text=No+Logo';
            }}
          />
        </div>
        <div className="shop-header-info">
          <h2 className="shop-name">{shop_name}</h2>
          <p className="shop-slogan">{slogan}</p>
        </div>
        {/* ❌ ไม่มีปุ่มแก้ไข/ลบในหน้าสาธารณะ */}
      </div>

      {/* About + Categories + Address */}
      <div className='card5'>
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
              <span key={index} className="shop-tag">{cat}</span>
            ))}
          </div>
        </div>

        <div className="shop-section">
          <h3>📍 ที่อยู่ของร้าน</h3>
          <div className="shop-address-box">
            <div><strong>ที่อยู่:</strong> {ShopAddress?.address || <i>ไม่มีข้อมูล</i>}</div>
            <div><strong>ตำบล / แขวง:</strong> {ShopAddress?.sub_district || <i>ไม่มีข้อมูล</i>}</div>
            <div><strong>อำเภอ / เขต:</strong> {ShopAddress?.district || <i>ไม่มีข้อมูล</i>}</div>
            <div><strong>จังหวัด:</strong> {ShopAddress?.province || <i>ไม่มีข้อมูล</i>}</div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="shop-section">
        <h3><AppstoreOutlined style={{ marginRight: 6 }} /> สินค้าในร้าน ({products.length})</h3>
        {products.length === 0 ? (
          <p>ยังไม่มีสินค้าในร้านนี้</p>
        ) : (
          <div className="product-list grid-wrap">
            {products.map((p) => (
              <PublicProductCard key={p.postId} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PublicProductCard: React.FC<{ product: any }> = ({ product }) => {
  const imgs: string[] = Array.isArray(product.images) ? product.images : [];
  const [active, setActive] = useState(0);
  const mainImg = imgs[active] || 'https://via.placeholder.com/300?text=No+Image';

  return (
    <div className="product-card">
      {/* ❌ ไม่มีปุ่มแก้ไข/ลบ */}
      <img
        className="main-image"
        src={mainImg}
        alt={product.name}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Image';
        }}
      />

      {imgs.length > 1 && (
        <div className="image-thumbnails" role="listbox" aria-label="รูปสินค้าเพิ่มเติม">
          {imgs.map((src, i) => (
            <button
              key={i}
              type="button"
              className={`thumb ${i === active ? 'active' : ''}`}
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
      <p style={{ marginTop: 4, fontSize: "0.9rem", color: "#555" }}>
        คำอธิบาย: {product.description}
      </p>
      <p style={{ marginTop: 4, fontSize: "0.9rem", color: "#555" }}>
        คงเหลือ: {product.quantity}
      </p>
      <p className="product-cat">{product.category}</p>
      <p className="product-price">{product.price} บาท</p>
    </div>
  );
};

export default ShopPublic;
