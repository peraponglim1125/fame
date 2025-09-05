package entity

import (
	"time"
	"gorm.io/gorm"
)

type DMPost struct {
	gorm.Model
	ThreadID uint     `gorm:"index;not null" json:"threadId"`
	Thread   DMThread `gorm:"foreignKey:ThreadID;references:ID" json:"-"`

	SenderID uint   `gorm:"index;not null" json:"senderId"`
	Sender   Member `gorm:"foreignKey:SenderID;references:ID" json:"sender"`

	Content  string     `gorm:"type:text" json:"content"`
	IsRead   bool       `gorm:"default:false" json:"isRead"`
	EditedAt *time.Time `json:"editedAt"`

	// จุดที่พัง — ต้องบอกว่าใช้ PostID เป็น FK ชี้กลับมา
	Files []DMFile `gorm:"foreignKey:PostID;references:ID;constraint:OnDelete:CASCADE" json:"files"`
}
func (DMPost) TableName() string { return "dm_posts" }
