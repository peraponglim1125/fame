package entity

import (
	"errors"
	"time"
	"gorm.io/gorm"
)

type DMThread struct {
	gorm.Model
	User1ID       uint    `gorm:"not null;index:idx_dm_pair,unique" json:"user1Id"`
	User2ID       uint    `gorm:"not null;index:idx_dm_pair,unique" json:"user2Id"`
	User1         Member  `gorm:"foreignKey:User1ID;references:ID" json:"user1"`
	User2         Member  `gorm:"foreignKey:User2ID;references:ID" json:"user2"`
	LastMessageAt time.Time `gorm:"index" json:"lastMessageAt"`

	// บอกชัดว่า DMPost ใช้คีย์อะไรชี้กลับมา
	Posts []DMPost `gorm:"foreignKey:ThreadID;references:ID;constraint:OnDelete:CASCADE" json:"posts"`
}
func (DMThread) TableName() string { return "dm_threads" }

func (t *DMThread) BeforeCreate(tx *gorm.DB) (err error) {
	if t.User1ID == t.User2ID { return errors.New("cannot open thread with self") }
	if t.User1ID > t.User2ID { t.User1ID, t.User2ID = t.User2ID, t.User1ID }
	return nil
}
