// Checkout.tsx
import React from "react";
import "./Checkout.css";
import useEcomStore from "../../store/ecom-store";
import { Link } from "react-router-dom";

const Cart: React.FC = () => {
  const carts = useEcomStore((state) => state.carts) as any[];
  const GettotalPrice = useEcomStore((state) => state.GettotalPrice);
  const token = useEcomStore((state: any) => state.token)

  return (
    <div className="page">
      {/* ===== Delivery Address ===== */}
      <section className="card">
        <div className="card-head">Delivery Address</div>
        <div className="addr">
          <div className="addr-name">Nropnipa Qwerty (+66) 874658675</div>

          {/*ที่อยู่ */}
          <div className="addr-line">
            Suranaree University of Technology, Suranwiwet Building 12, No. 111,
            University Road, Suranaree Subdistrict, Mueang Nakhon Ratchasima
            District, Nakhon Ratchasima Province, 30000
          </div>
          <div className="addr-actions">
            <span className="tag">Default</span>
            <button className="link">Change</button>
          </div>
        </div>
      </section>

      {/* ===== Products Ordered ===== */}
      <section className="card">
        <div className="card-head">Products Ordered</div>
        <div className="shop">Tester</div>

        {/* หัวตาราง */}
        <div className="tbl head">
          <div>Product</div>
          <div>Unit Price</div>
          <div>Amount</div>
          <div>Item Subtotal</div>
        </div>

        {/* map carts ตรงนี้ */}
        {carts.map((item, index) => (
          <div className="tbl row" key={index}>
            <div className="prod">
              <img
                src={`http://localhost:8080${item?.Product?.ProductImage?.[0]?.image_path}`}
                alt={item?.Product?.name}
              />
              <span className="prod-name">{item?.Product?.name}</span>
            </div>
            <div className="num">฿{item?.Product?.price}</div>
            <div className="num">{item.count}</div>
            <div className="num">฿{item?.Product?.price * item.count}</div>
          </div>
        ))}

        <div className="divider" />
        <div className="between">
          <div>Shop Voucher</div>
          <button className="link">Select or enter code</button>
        </div>

        <div className="total-line">
          <div className="right">
            <span className="muted">Order Total ({carts.length} Items):</span>
            <span className="grand">฿{GettotalPrice()}</span>
          </div>
        </div>
      </section>

      {/* ===== Platform Voucher + Payment + Summary ===== */}
      <section className="card">
        <div className="between">
          <div className="card-head m0">Platform Voucher</div>
          <button className="link">Select or enter code</button>
        </div>

        <div className="pay">
          <div className="pay-title">Payment Method:</div>
          <label className="radio">
            <input type="radio" name="pay" defaultChecked />
            <span className="dot" /> QR PromptPay
          </label>
          <label className="radio">
            <input type="radio" name="pay" />
            <span className="dot" /> Cash on Delivery
          </label>
        </div>

        <div className="sum">

          <div className="sum-total">
            <span>Total Payment</span>
            <span className="grand">฿{GettotalPrice()}</span>
          </div>
        </div>

        <div className="foot">
          <span className="policy">
            By clicking 'Place Order', you are agreeing to Shopee’s{" "}
            <a href="#" className="link">
              Return and Refund policy
            </a>
          </span>
          <div className="place-order">
            {token ? (
              <button className="btn-orange">Place Order</button>
            ) : (
              <Link to="/login">
                <button className="btn-blue">Login</button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Cart;
