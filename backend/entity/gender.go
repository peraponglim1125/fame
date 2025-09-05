package entity

import (
	"gorm.io/gorm"
)

type Gender struct {
    gorm.Model
    Gender  string
    People  []People `gorm:"foreignKey:GenderID;references:ID"`
}