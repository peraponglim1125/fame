package entity

import (
	"errors"
	"gorm.io/gorm"
)

type FriendLink struct {
	gorm.Model
	AID uint `gorm:"not null;index:idx_friend_pair,unique" json:"aid"`
	BID uint `gorm:"not null;index:idx_friend_pair,unique" json:"bid"`
}
func (FriendLink) TableName() string { return "friend_links" }

func (f *FriendLink) BeforeCreate(tx *gorm.DB) (err error) {
	if f.AID == f.BID {
		return errors.New("cannot friend self")
	}
	if f.AID > f.BID {
		f.AID, f.BID = f.BID, f.AID
	}
	return nil
}
