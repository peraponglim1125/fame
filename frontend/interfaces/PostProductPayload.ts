export interface PostProductPayload {
  product_name: string;
  description: string;
  price: number;
  quantity: number;
  category_id: number;
  seller_id: number;
  images: string[]; // รองรับหลายรูป
}
