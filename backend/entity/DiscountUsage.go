package entity

import (
	"time"
	"gorm.io/gorm"
)
type DiscountUsage struct {
    gorm.Model

    MemberID       uint        `json:"member_id"`
    Member         Member      `gorm:"foreignKey:MemberID"`

    DiscountcodeID uint        `json:"discountcode_id"`
    Discountcode   Discountcode `gorm:"foreignKey:DiscountcodeID"`

    OrderID        uint        `json:"order_id"`
    Order          Order       `gorm:"foreignKey:OrderID"`

    UsedAt time.Time `json:"used_at"`
}
