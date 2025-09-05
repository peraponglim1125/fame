import axios from "axios";

export const getAllcategory = async() =>{
    return await axios.get("http://localhost:8080/api/listCategory");
};
export const getAllcategoryShop = async() =>{
    return await axios.get("http://localhost:8080/api/listCategoryShop");
};
