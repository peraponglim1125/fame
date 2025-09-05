import axios from 'axios'


export const currentUser = async (token:any) => await axios.get("http://localhost:8080/api/current-user",  {
    headers: {
        Authorization: `Bearer ${token}`
    }
})

export const getAllproducts = async() =>{
    return await axios.get("http://localhost:8080/api/listAllProducts");
};

export const getMyPostProducts = async(token: string) =>{
    return await axios.get("http://localhost:8080/api/ListMyPostProducts",{
        headers:{
            Authorization: `Bearer ${token}`,
        },
    });
};
export const ListMyProfile = async(token: string) =>{
    return await axios.get("http://localhost:8080/api/ListMyProfile",{
        headers:{
            Authorization: `Bearer ${token}`,
        },
    });
};

