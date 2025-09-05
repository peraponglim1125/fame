package entity

import "gorm.io/gorm"

type ShopCategory struct {
	gorm.Model

	CategoryName string `gorm:"type:varchar(100);not null" json:"category_name"`

	ShopProfile []ShopProfile `gorm:"foreignKey:ShopCategoryID"`
}
