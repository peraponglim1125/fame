
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import PostProduct from "../post-product";
import Shopprofile from "../ShopProfile/Createshop";
import Productlist from "../post-product/Productlist";
import Profile from "../ShopProfile/Profile";
import Layout from "../layout/Layout";
import RegisterForm from "../authentication/Register";
import LoginForm from "../authentication/Login";
import ProtectRouteUser from "./ProtectRouteUser";
import EditShopProfile from "../ShopProfile/EditShopProfile/EditShopProfile";
import AdminLayout from "../admin/Admin";
import Category from "../../component/admin/Category";
import CategoryShop from "../../component/admin/CategoryShop";
import ShopPublic from "../ShopProfile/Profile/ShopPublic";
import Cart from "../cart/Cart";
import Createcode from "../DiscountCode/Createcode";
import Messenger from "../Messenger/Messenger";



const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Productlist /> },
      { path: "login", element: <LoginForm /> },
      { path: "Admin", element: <AdminLayout /> },
      { path: "shop/:sellerId", element: <ShopPublic /> },
      { path: "Cart", element: <Cart /> },
      { path: "Messenger", element: <Messenger /> },
      

      { path: "register", element: <RegisterForm /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },

  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Category /> },
      { path: "category", element: <Category /> },
      { path: "shopcategory", element: <CategoryShop /> },
      { path: "Createcode", element: <Createcode /> },

    ],
  },
  {
    path: "/user",
    element: <ProtectRouteUser element={<Layout />} />,
    children: [
      { index: true, element: <Productlist /> },
      { path: "create-post", element: <PostProduct /> },
      { path: "create-profile", element: <Shopprofile /> },
      { path: "/user/products/:postId/edit", element: <PostProduct /> },
      { path: "shop/:sellerId", element: <ShopPublic /> },
      { path: "profile", element: <Profile /> },
      { path: "profile/edit", element: <EditShopProfile /> },
      { path: "*", element: <Navigate to="/user" replace /> },
    ],
  },
]);


export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
