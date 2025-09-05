
import useEcomStore from '../../store/ecom-store';
import './navbar.css'
import { Link, useNavigate } from "react-router-dom";
const Navbar = () => {
  const token = useEcomStore((state: any) => state.token)
  const hasShop = useEcomStore((state: any) => state.hasShop)
  const navigate = useNavigate();

  const handleClick = () => {
    if (hasShop) {
      navigate('/user/Profile'); // ไปหน้าโปรไฟล์ร้านค้า
    } else {
      navigate('/user/Create-profile'); // ไปหน้าสร้างร้านค้า
    }

  };
  const handleLogout = () => {
    // ✅ ล้างข้อมูลจาก store
    useEcomStore.getState().clearPersistedStore();

    // ✅ กลับไปหน้าแรก
    navigate('/');
  };
  return (
    <div className="background-header">
      <div className="header-row">

        <div className="header-left">
          <Link to="/product-list" className="no-border-button left-font-size-large">

            <button className="no-border-button left-font-size-large">
              Seller Centre
            </button>
          </Link>
          <span>|</span>
          {token && (

            <button
              onClick={handleClick}
              className="no-border-button left-font-size-large"
            >
              ShopProfile
              <span>|</span>
            </button>
          )}

          <Link to="/Cart" className="no-border-button left-font-size-large">

            <button className="no-border-button left-font-size-large">
              Cart
            </button>
          </Link>

          {token &&
            (
              <button onClick={handleLogout}
                className="no-border-button left-font-size-large"
              >
                Logout
              </button>
            )
          }

        </div>

        <div className="header-right">
          {!token && (

            <Link to="/login" className="no-border-button left-font-size-large">

              <button className="no-border-button left-font-size-large">
                Login/Register
              </button>
            </Link>

          )}

          <button className="no-border-button left-font-size-large">
            Help
          </button>

          <select className="select-no-border left-font-size-large" defaultValue="English">
            <option value="English" style={{ color: "black" }}>English</option>
            <option value="Thai" style={{ color: "black" }}>Thai</option>
          </select>
          <Link to="/Messenger" className="no-border-button left-font-size-large">
            message

          </Link>

        </div>
      </div>
    </div>
  );
};



export default Navbar
