// entity/discountcode.go
package entity

import (
	"time"
	"gorm.io/gorm"
)

type Discountcode struct {
	gorm.Model

	Name       string     `gorm:"size:120;not null" json:"name"`
	Amount     int        `gorm:"not null" json:"amount"`
	MinOrder   int        `gorm:"not null;default:0" json:"min_order"`
	UsageLimit int        `gorm:"not null;default:0" json:"usage_limit"`
	TimesUsed  int        `gorm:"not null;default:0" json:"times_used"`
	StartsAt   *time.Time `json:"starts_at"`
	ExpiresAt  *time.Time `json:"expires_at"`

	// เก็บ path/URL ของรูปหลังบันทึกไฟล์
	ImageURL string `gorm:"type:text" json:"image_url"`
	DiscountUsages []DiscountUsage `json:"discount_usages"`
}

