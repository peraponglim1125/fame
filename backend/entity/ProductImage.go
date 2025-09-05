// entity/product_image.go
package entity

import "gorm.io/gorm"

type ProductImage struct {
	gorm.Model
	ImagePath  string `json:"image_path"`         // 👉 ตรงกับ React: image_path
	Product_ID *uint  `json:"product_id"`         // FK
}
