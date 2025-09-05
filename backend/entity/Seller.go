package entity

import (
    
    "gorm.io/gorm")

type Seller struct {
    gorm.Model
    Name     string
    Address  string
    MemberID uint
    Products []Product `gorm:"foreignKey:SellerID;references:ID"`
    ShopProfile ShopProfile `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
    Posts []Post_a_New_Product `gorm:"foreignKey:SellerID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}