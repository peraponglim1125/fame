

import './Productlist.css'

import { useEffect, useState } from "react";
import { getAllproducts } from '../../../api/auth';
import { message } from 'antd';
import axios from 'axios';
import { getAllcategory } from '../../../api/categoty';
import { Link } from 'react-router-dom';
import Cardcategory from './cardcategory';
import Cardlistproduct from './Cardlistproduct';
function ProductList() {

   const [products, setProducts] = useState<any[]>([]);
   const [categories, setCategories] = useState<any[]>([]);
   const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

   useEffect(() => {
      const fetchData = async () => {
         try {
            const res = await getAllproducts();
            console.log(res);
            setProducts(res.data?.data || []);
         } catch (err) {
            console.error("โหลดสินค้าล้มเหลว:", err);
         }
      };
      fetchData();
   }, []);

   useEffect(() => {
      const fetchCategories = async () => {
         try {
            const res = await getAllcategory(); // 👉 API GET /api/category
            setCategories(res.data?.data || []);

         } catch (err) {
            console.error("โหลดหมวดหมู่ล้มเหลว:", err);
            message.error("โหลดหมวดหมู่ล้มเหลว");
         }
      };
      fetchCategories();
   }, []);

   const filteredProducts =
      selectedCategory === "ทั้งหมด"
         ? products
         : products.filter((p) => p?.Category?.name === selectedCategory);




   return (
      <>

         <div className='containerlist'>

            <nav>
               <Cardcategory categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

            </nav>
            <section>
               <Cardlistproduct filteredProducts={filteredProducts} />


            </section>
         </div>
      </>
   );



}

export default ProductList