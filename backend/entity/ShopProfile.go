package entity

import (
	"time"

	"gorm.io/gorm"
)

type ShopProfile struct {
	gorm.Model
	ShopName        string    `gorm:"type:varchar(255);not null;unique" json:"shop_name"`
	ShopDescription string    `gorm:"type:varchar(500);not null" json:"shop_description"`
	OpenDate        time.Time `gorm:"type:date;not null" json:"open_date"`
	LogoPath        string    `gorm:"type:varchar(255);not null" json:"logo_path"`
	Slogan          string    `gorm:"type:varchar(255);not null" json:"slogan"`

	AddressID   *uint        `json:"address_id"`
	ShopAddress *ShopAddress `gorm:"foreignKey:AddressID;references:ID"`

	ShopCategoryID *uint        `json:"shopCategoryID"`
	Category       ShopCategory `gorm:"foreignKey:ShopCategoryID"`

	SellerID *uint   `gorm:"uniqueIndex:ux_shop_seller" json:"seller_id"`
	Seller   *Seller `gorm:"foreignKey:SellerID;references:ID"`
}
