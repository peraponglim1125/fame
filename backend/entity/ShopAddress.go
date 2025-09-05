package entity

import "gorm.io/gorm"

type ShopAddress struct {
	gorm.Model

	SubDistrict string `gorm:"type:varchar(100);not null" json:"sub_district"`
	District    string `gorm:"type:varchar(100);not null" json:"district"`
	Address     string `gorm:"type:varchar(255);not null" json:"address"`
	Province    string `gorm:"type:varchar(100);not null" json:"province"`

	ShopProfile *ShopProfile `gorm:"foreignKey:AddressID"`
}
