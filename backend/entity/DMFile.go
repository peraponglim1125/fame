package entity

import "gorm.io/gorm"

type DMFile struct {
	gorm.Model
	PostID  uint   `gorm:"index;not null" json:"postId"`
	Post    DMPost `gorm:"foreignKey:PostID;references:ID" json:"-"`

	FileURL  string `json:"fileUrl"`
	FileType string `json:"fileType"` // image | video | file
}
func (DMFile) TableName() string { return "dm_files" }
