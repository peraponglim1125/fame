// entity/post.go
package entity

import "gorm.io/gorm"

type Post_a_New_Product struct {
	gorm.Model

	Product_ID  *uint    `json:"product_id"`
	Product     Product  `gorm:"foreignKey:Product_ID;constraint:OnDelete:SET NULL;" json:"Product"`

	Category_ID *uint    `json:"category_id"`
	Category    Category `gorm:"foreignKey:Category_ID" json:"Category"`

	SellerID *uint  `json:"seller_id"`
	Seller   Seller `gorm:"foreignKey:SellerID;references:ID" json:"Seller"`
}
