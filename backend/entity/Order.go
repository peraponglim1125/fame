package entity

import (
	
	"gorm.io/gorm"
)
type Order struct {
    gorm.Model

    MemberID uint   `json:"member_id"`
    Member   Member `gorm:"foreignKey:MemberID"`

    TotalPrice int `json:"total_price"`

    // ความสัมพันธ์
    DiscountUsages []DiscountUsage `json:"discount_usages"`
}
