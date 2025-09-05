export interface ShopProfilePayload {
  shop_name: string;
  slogan: string;
  shop_description: string;
  logo_path: string;
  address: {
    address : string;
    sub_district: string;
    district: string;
    province: string;
  };
  category_id: number;
  seller_id: number;
}